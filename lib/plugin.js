'use strict'

const FastQ = require('fastq')
const { EventEmitter } = require('events')
const { inherits } = require('util')
const { AVV_ERR_READY_TIMEOUT, AVV_ERR_PLUGIN_NOT_VALID } = require('./errors')
const { debug } = require('./debug')
const { kPluginMeta } = require('./symbols')
const { createPromise } = require('./promise')
const { noop } = require('./noop')

function getName (func, optionsOrFunc) {
  // use explicit function metadata if set
  if (func[kPluginMeta] && func[kPluginMeta].name) {
    return func[kPluginMeta].name
  }

  if (typeof optionsOrFunc !== 'undefined' && typeof optionsOrFunc !== 'function' && optionsOrFunc.name) {
    return optionsOrFunc.name
  }

  // use the function name if it exists
  if (func.name) {
    return func.name
  }

  // takes the first two lines of the function if nothing else works
  return func.toString().split('\n').slice(0, 2).map(s => s.trim()).join(' -- ')
}

function Plugin (parent, func, optionsOrFunc, isAfter, timeout) {
  this.started = false
  this.func = func
  this.options = optionsOrFunc
  this.onFinish = null
  this.parent = parent
  this.timeout = timeout === undefined ? parent._timeout : timeout
  this.name = getName(func, optionsOrFunc)
  this.isAfter = isAfter
  this.q = FastQ(parent, loadPluginNextTick, 1)
  this.q.pause()
  this._error = null
  this.loaded = false
  this._promise = null

  // always start the queue in the next tick
  // because we try to attach subsequent call to use()
  // to the right plugin. we need to defer them,
  // or they will end up at the top of _current
}

inherits(Plugin, EventEmitter)

Plugin.prototype.exec = function (server, callback) {
  const func = this.func
  let completed = false
  const name = this.name

  if (this.parent._error && !this.isAfter) {
    debug('skipping loading of plugin as parent errored and it is not an after', name)
    process.nextTick(callback)
    return
  }

  if (!this.isAfter) {
    // Skip override for after
    try {
      this.server = this.parent.override(server, func, this.options)
    } catch (err) {
      debug('override errored', name)
      return callback(err)
    }
  } else {
    this.server = server
  }

  this.options = typeof this.options === 'function' ? this.options(this.server) : this.options

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

    callback(err)
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
  const promise = func(this.server, this.options, done)

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
    this.server.after((err, callback) => {
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

      process.nextTick(callback, err)
    })
    this.q.resume()
  }

  let result

  if (!this._promise) {
    this._promise = createPromise()
    result = this._promise.promise

    if (!this.server) {
      this.on('start', setup)
    } else {
      setup()
    }
  } else {
    result = Promise.resolve()
  }

  return result
}

Plugin.prototype.enqueue = function (obj, callback) {
  debug('enqueue', this.name, obj.name)
  this.emit('enqueue', this.server ? this.server.name : null, this.name, Date.now())
  this.q.push(obj, callback)
}

Plugin.prototype.finish = function (err, callback) {
  debug('finish', this.name, err)
  const done = () => {
    if (this.loaded) {
      return
    }

    debug('loaded', this.name)
    this.emit('loaded', this.server ? this.server.name : null, this.name, Date.now())
    this.loaded = true

    callback(err)
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
function loadPluginNextTick (plugin, callback) {
  const parent = this
  process.nextTick(loadPlugin.bind(parent), plugin, callback)
}

function validatePluginFunction (plugin) {
  // bundler or TypeScript support
  if (plugin && typeof plugin === 'object' && typeof plugin.default === 'function') {
    plugin = plugin.default
  }

  // validate if plugin is a function or Promise
  if (!(plugin && (typeof plugin === 'function' || typeof plugin.then === 'function'))) {
    throw new AVV_ERR_PLUGIN_NOT_VALID(typeof plugin)
  }

  return plugin
}

// loads a plugin
function loadPlugin (plugin, callback) {
  if (typeof plugin.func.then === 'function') {
    plugin.func.then((fn) => {
      if (typeof fn.default === 'function') {
        fn = fn.default
      }
      plugin.func = fn
      loadPlugin.call(this, plugin, callback)
    }, callback)
    return
  }

  const last = this._current[0]

  // place the plugin at the top of _current
  this._current.unshift(plugin)

  plugin.exec((last && last.server) || this._instance, (err) => {
    plugin.finish(err, (err) => {
      this._current.shift()
      callback(err)
    })
  })
}

module.exports = {
  Plugin,
  validatePluginFunction,
  loadPlugin
}
