'use strict'

const fastq = require('fastq')
const EE = require('events').EventEmitter
const inherits = require('util').inherits
const { debug } = require('./lib/debug')
const { loadPlugin } = require('./lib/load-plugin')
const { createPromise } = require('./lib/create-promise')
const { AVV_ERR_READY_TIMEOUT } = require('./lib/errors')
const { getPluginName } = require('./lib/get-plugin-name')

function Plugin (parent, func, options, isAfter, timeout) {
  this.started = false
  this.func = func
  this.opts = options
  this.onFinish = null
  this.parent = parent
  this.timeout = timeout === undefined ? parent._timeout : timeout
  this.name = getPluginName(func, options)
  this.isAfter = isAfter
  this.q = fastq(parent, loadPluginNextTick, 1)
  this.q.pause()
  this._error = null
  this.loaded = false
  this._promise = null

  // always start the queue in the next tick
  // because we try to attach subsequent call to use()
  // to the right plugin. we need to defer them,
  // or they will end up at the top of _current
}

inherits(Plugin, EE)

Plugin.prototype.exec = function (server, cb) {
  const func = this.func
  let completed = false
  const name = this.name

  if (this.parent._error && !this.isAfter) {
    debug('skipping loading of plugin as parent errored and it is not an after', name)
    process.nextTick(cb)
    return
  }

  if (!this.isAfter) {
    // Skip override for after
    try {
      this.server = this.parent.override(server, func, this.opts)
    } catch (err) {
      debug('override errored', name)
      return cb(err)
    }
  } else {
    this.server = server
  }

  this.opts = typeof this.opts === 'function' ? this.opts(this.server) : this.opts

  debug('exec', name)

  let timer

  const done = (err) => {
    if (completed) {
      debug('loading complete', name)
      return
    }

    this._error = err

    if (err) {
      debug('exec errored', name)
    } else {
      debug('exec completed', name)
    }

    completed = true

    if (timer) {
      clearTimeout(timer)
    }

    cb(err)
  }

  if (this.timeout > 0) {
    debug('setting up timeout', name, this.timeout)
    timer = setTimeout(function () {
      debug('timed out', name)
      timer = null
      const err = new AVV_ERR_READY_TIMEOUT(name)
      err.fn = func
      done(err)
    }, this.timeout)
  }

  this.started = true
  this.emit('start', this.server ? this.server.name : null, this.name, Date.now())
  const promise = func(this.server, this.opts, done)

  if (promise && typeof promise.then === 'function') {
    debug('exec: resolving promise', name)

    promise.then(
      () => process.nextTick(done),
      (e) => process.nextTick(done, e))
  }
}

Plugin.prototype.loadedSoFar = function () {
  if (this.loaded) {
    return Promise.resolve()
  }

  const setup = () => {
    this.server.after((err, cb) => {
      this._error = err
      this.q.pause()

      if (err) {
        debug('rejecting promise', this.name, err)
        this._promise.reject(err)
      } else {
        debug('resolving promise', this.name)
        this._promise.resolve()
      }
      this._promise = null

      process.nextTick(cb, err)
    })
    this.q.resume()
  }

  let res

  if (!this._promise) {
    this._promise = createPromise()
    res = this._promise.promise

    if (!this.server) {
      this.on('start', setup)
    } else {
      setup()
    }
  } else {
    res = Promise.resolve()
  }

  return res
}

Plugin.prototype.enqueue = function (obj, cb) {
  debug('enqueue', this.name, obj.name)
  this.emit('enqueue', this.server ? this.server.name : null, this.name, Date.now())
  this.q.push(obj, cb)
}

Plugin.prototype.finish = function (err, cb) {
  debug('finish', this.name, err)
  const done = () => {
    if (this.loaded) {
      return
    }

    debug('loaded', this.name)
    this.emit('loaded', this.server ? this.server.name : null, this.name, Date.now())
    this.loaded = true

    cb(err)
  }

  if (err) {
    if (this._promise) {
      this._promise.reject(err)
      this._promise = null
    }
    done()
    return
  }

  const check = () => {
    debug('check', this.name, this.q.length(), this.q.running(), this._promise)
    if (this.q.length() === 0 && this.q.running() === 0) {
      if (this._promise) {
        const wrap = () => {
          debug('wrap')
          queueMicrotask(check)
        }
        this._promise.resolve()
        this._promise.promise.then(wrap, wrap)
        this._promise = null
      } else {
        done()
      }
    } else {
      debug('delayed', this.name)
      // finish when the queue of nested plugins to load is empty
      this.q.drain = () => {
        debug('drain', this.name)
        this.q.drain = noop

        // we defer the check, as a safety net for things
        // that might be scheduled in the loading callback
        queueMicrotask(check)
      }
    }
  }

  queueMicrotask(check)

  // we start loading the dependents plugins only once
  // the current level is finished
  this.q.resume()
}

/**
 * Delays plugin loading until the next tick to ensure any bound `_after` callbacks have a chance
 * to run prior to executing the next plugin
 */
function loadPluginNextTick (plugin, callback) {
  process.nextTick(loadPlugin, this, plugin, callback)
}

function noop () {}

module.exports = {
  Plugin
}
