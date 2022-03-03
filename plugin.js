'use strict'

const queueMicrotask = require('queue-microtask')
const fastq = require('fastq')
const EE = require('events').EventEmitter
const inherits = require('util').inherits
const debug = require('debug')('avvio')
const CODE_PLUGIN_TIMEOUT = 'ERR_AVVIO_PLUGIN_TIMEOUT'

function getName (func) {
  // let's see if this is a file, and in that case use that
  // this is common for plugins
  const cache = require.cache
  const keys = Object.keys(cache)

  // eslint-disable-next-line no-var
  for (var i = 0; i < keys.length; i++) {
    if (cache[keys[i]].exports === func) {
      return keys[i]
    }
  }

  // if not maybe it's a named function, so use that
  if (func.name) {
    return func.name
  }

  // takes the first two lines of the function if nothing else works
  return func.toString().split('\n').slice(0, 2).map(s => s.trim()).join(' -- ')
}

function promise () {
  const obj = {}

  obj.promise = new Promise((resolve, reject) => {
    obj.resolve = resolve
    obj.reject = reject
  })

  return obj
}

function Plugin (parent, func, optsOrFunc, isAfter, timeout) {
  this.started = false
  this.func = func
  this.opts = optsOrFunc
  this.onFinish = null
  this.parent = parent
  this.timeout = timeout === undefined ? parent._timeout : timeout
  this.name = getName(func)
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
      const err = new Error(`${CODE_PLUGIN_TIMEOUT}: plugin did not start in time: ${name}. You may have forgotten to call 'done' function or to resolve a Promise`)
      err.code = CODE_PLUGIN_TIMEOUT
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
    this._promise = promise()
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

// delays plugin loading until the next tick to ensure any bound `_after` callbacks have a chance
// to run prior to executing the next plugin
function loadPluginNextTick (toLoad, cb) {
  const parent = this
  process.nextTick(loadPlugin.bind(parent), toLoad, cb)
}

// loads a plugin
function loadPlugin (toLoad, cb) {
  if (typeof toLoad.func.then === 'function') {
    toLoad.func.then((fn) => {
      if (typeof fn.default === 'function') {
        fn = fn.default
      }
      toLoad.func = fn
      loadPlugin.call(this, toLoad, cb)
    }, cb)
    return
  }

  const last = this._current[0]

  // place the plugin at the top of _current
  this._current.unshift(toLoad)

  toLoad.exec((last && last.server) || this._server, (err) => {
    toLoad.finish(err, (err) => {
      this._current.shift()
      cb(err)
    })
  })
}

function noop () {}

module.exports = Plugin
module.exports.loadPlugin = loadPlugin
