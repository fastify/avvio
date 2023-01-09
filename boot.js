'use strict'

const { EventEmitter } = require('events')
const { inherits } = require('util')
const {
  AVV_ERR_EXPOSE_ALREADY_DEFINED,
  AVV_ERR_CALLBACK_NOT_FN,
  AVV_ERR_ROOT_PLG_BOOTED,
  AVV_ERR_READY_TIMEOUT
} = require('./lib/errors')
const TimeTree = require('./time-tree')
const { Plugin, validatePluginFunction, loadPlugin } = require('./lib/plugin')
const { debug } = require('./lib/debug')
const { executeWithThenable, thenify } = require('./lib/thenable')
const { kAvvio } = require('./lib/symbols')
const { noop } = require('./lib/noop')
const { createQueue } = require('./lib/queue')
const { createPromise } = require('./lib/promise')

function wrap (instance, options, avvio) {
  const expose = options.expose || {}
  const useKey = expose.use || 'use'
  const afterKey = expose.after || 'after'
  const readyKey = expose.ready || 'ready'
  const onCloseKey = expose.onClose || 'onClose'
  const closeKey = expose.close || 'close'

  if (instance[useKey]) {
    throw new AVV_ERR_EXPOSE_ALREADY_DEFINED(useKey)
  }

  if (instance[afterKey]) {
    throw new AVV_ERR_EXPOSE_ALREADY_DEFINED(afterKey)
  }

  if (instance[readyKey]) {
    throw new AVV_ERR_EXPOSE_ALREADY_DEFINED(readyKey)
  }

  instance[useKey] = function (fn, options) {
    avvio.use(fn, options)
    return this
  }

  Object.defineProperties(instance, {
    [kAvvio]: { get () { return true }, configurable: false, enumerable: false },
    then: { get: thenify.bind(avvio), configurable: false, enumerable: false }
  })

  instance[afterKey] = function (func) {
    if (typeof func !== 'function') {
      return avvio._loadRegistered()
    }
    avvio.after(encapsulateThreeParam(func, this))
    return this
  }

  instance[readyKey] = function (func) {
    if (func && typeof func !== 'function') {
      throw new AVV_ERR_CALLBACK_NOT_FN(readyKey, typeof func)
    }
    return avvio.ready(func ? encapsulateThreeParam(func, this) : undefined)
  }

  instance[onCloseKey] = function (func) {
    if (typeof func !== 'function') {
      throw new AVV_ERR_CALLBACK_NOT_FN(onCloseKey, typeof func)
    }
    avvio.onClose(encapsulateTwoParam(func, this))
    return this
  }

  instance[closeKey] = function (func) {
    if (func && typeof func !== 'function') {
      throw new AVV_ERR_CALLBACK_NOT_FN(closeKey, typeof func)
    }

    if (func) {
      avvio.close(encapsulateThreeParam(func, this))
      return this
    }

    // this is a Promise
    return avvio.close()
  }
}

/**
 * avvio instance creation
 * @param {*} instance
 * @param {*} options
 * @param {*} done
 * @returns
 */
function Avvio (instance, options, done) {
  // Avvio(done)
  if (typeof instance === 'function' && arguments.length === 1) {
    done = instance
    options = {}
    instance = null
  }

  // Avvio(instance, done)
  if (typeof options === 'function') {
    done = options
    options = {}
  }

  // Avvio()
  // Avvio(options)
  options = options || {}

  // Avvio() or new Avvio()
  if (!(this instanceof Avvio)) {
    const avvio = new Avvio(instance, options, done)

    if (instance) {
      wrap(instance, options, avvio)
    }

    return avvio
  }

  // ---constructor---

  // remove the limit of listeners
  this.setMaxListeners(0)

  // internals
  this._timeout = Number(options.timeout ?? 0)
  this._instance = instance ?? this
  this._current = [] // plugin stack
  this._doStart = null
  this._error = null
  this._lastUsed = null
  this._isOnCloseHandlerKey = Symbol('isOnCloseHandler')

  if (options.autostart !== false) {
    options.autostart = true
  }

  if (done) {
    this.once('start', done)
  }

  // state control
  this.started = false // is "true" after "Avvio#start()" has been called
  this.booted = false // is "true" after all plugins "loaded" emitted
  this.pluginTree = new TimeTree()

  // prepare queue
  this._readyQ = createQueue(this, callWithCallbackOrNextTick, () => {
    this.emit('start')
    // start event should be emitted once only
    this._readyQ.drain = noop
  })
  this._closeQ = createQueue(this, closeWithCallbackOrNextTick, () => {
    this.emit('close')
    // close event should be emitted once only
    this._readyQ.drain = noop
  })

  this._root = new Plugin(this, root.bind(this), options, false, 0)
  this._root.once('start', (serverName, funcName, time) => {
    const nodeId = this.pluginTree.start(null, funcName, time)
    this._root.once('loaded', (serverName, funcName, time) => {
      this.pluginTree.stop(nodeId, time)
    })
  })

  loadPlugin.call(this, this._root, (error) => {
    debug('root plugin ready')
    try {
      this.emit('preReady')
      this._root = null
    } catch (prereadyError) {
      error = error || this._error || prereadyError
    }

    if (error) {
      this._error = error
      if (this._readyQ.length() === 0) {
        throw error
      }
    } else {
      this.booted = true
    }
    this._readyQ.resume()
  })
}

inherits(Avvio, EventEmitter)

// we define the getters
Object.defineProperties(Avvio.prototype, {
  [kAvvio]: { get () { return true }, configurable: false, enumerable: false },
  then: { get: thenify, configurable: false, enumerable: false }
})

/**
 * Start the plugin registration flow
 * @returns
 */
Avvio.prototype.start = function () {
  this.started = true

  // we need to wait any call to use() to happen
  process.nextTick(this._doStart)
  return this
}

/**
 * Override the context of plugin.
 * @param {*} instance
 * @param {*} func
 * @param {*} options
 * @returns
 */
Avvio.prototype.override = function (instance, func, options) {
  return instance
}

// load a plugin
Avvio.prototype.use = function (plugin, options) {
  this._lastUsed = this._addPlugin(plugin, options, false)
  return this
}

Avvio.prototype.after = function (func) {
  if (!func) {
    return this._loadRegistered()
  }

  this._addPlugin(_after.bind(this), {}, true)

  function _after (s, options, done) {
    callWithCallbackOrNextTick.call(this, func, done)
  }

  return this
}

Avvio.prototype.onClose = function (func) {
  // this is used to distinguish between onClose and close handlers
  // because they share the same queue but must be called with different signaturesult

  if (typeof func !== 'function') {
    throw new Error('not a function')
  }

  func[this._isOnCloseHandlerKey] = true
  this._closeQ.unshift(func, callback.bind(this))

  function callback (error) {
    if (error) this._error = error
  }

  return this
}

Avvio.prototype.close = function (func) {
  let promise

  if (func) {
    if (typeof func !== 'function') {
      throw new AVV_ERR_CALLBACK_NOT_FN('close', typeof func)
    }
  } else {
    promise = createPromise()
    func = function (error) {
      if (error) {
        promise.reject(error)
      } else {
        promise.resolve()
      }
    }
  }

  this.ready(() => {
    this._error = null
    this._closeQ.push(func)
    process.nextTick(this._closeQ.resume.bind(this._closeQ))
  })

  return promise?.promise
}

Avvio.prototype.ready = function (func) {
  if (func) {
    if (typeof func !== 'function') {
      throw new AVV_ERR_CALLBACK_NOT_FN('ready', typeof func)
    }
    this._readyQ.push(func)
    queueMicrotask(this.start.bind(this))
    return
  }

  return new Promise((resolve, reject) => {
    this._readyQ.push(readyPromiseCB)
    this.start()

    /**
     * The `encapsulateThreeParam` let callback function
     * bind to the right server instance.
     * In promises we need to track the last server
     * instance loaded, the first one in the _current queue.
     */
    const relativeContext = this._current[0].server

    function readyPromiseCB (error, context, done) {
      // the context is always binded to the root server
      if (error) {
        reject(error)
      } else {
        resolve(relativeContext)
      }
      process.nextTick(done)
    }
  })
}

Avvio.prototype.prettyPrint = function () {
  return this.pluginTree.prittyPrint()
}

Avvio.prototype.toJSON = function () {
  return this.pluginTree.toJSON()
}

Avvio.prototype._loadRegistered = function () {
  const plugin = this._current[0]
  const weNeedToStart = !this.started && !this.booted

  // if the root plugin is not loaded, let's resume that
  // so one can use after() befor calling ready
  if (weNeedToStart) {
    process.nextTick(() => this._root.q.resume())
  }

  if (!plugin) {
    return Promise.resolve()
  }

  return plugin.loadedSoFar()
}

Avvio.prototype._addPlugin = function (func, options, isAfter) {
  func = validatePluginFunction(func)
  options = options || {}

  if (this.booted) {
    throw new AVV_ERR_ROOT_PLG_BOOTED()
  }

  // we always add plugins to load at the current element
  const current = this._current[0]

  const plugin = new Plugin(this, func, options, isAfter)
  plugin.once('start', (serverName, funcName, time) => {
    const nodeId = this.pluginTree.start(current.name, funcName, time)
    plugin.once('loaded', (serverName, funcName, time) => {
      this.pluginTree.stop(nodeId, time)
    })
  })

  if (current.loaded) {
    throw new Error(plugin.name, current.name)
  }

  // we add the plugin to be loaded at the end of the current queue
  current.enqueue(plugin, (error) => {
    if (error) {
      this._error = error
    }
  })

  return plugin
}

module.exports = Avvio
module.exports.default = Avvio
module.exports.Avvio = Avvio

// Internal Function(s)

/**
 * root plugin
 * @param {*} context
 * @param {*} options
 * @param {*} done
 */
function root (context, options, done) {
  this._doStart = done
  if (options.autostart) {
    this.start()
  }
}

function callWithCallbackOrNextTick (func, callback) {
  const context = this._instance
  const error = this._error

  // with this the error will appear just in the next after/ready callback
  this._error = null
  if (func.length === 0) {
    this._error = error
    executeWithThenable(func, [], callback)
  } else if (func.length === 1) {
    executeWithThenable(func, [error], callback)
  } else {
    if (this._timeout === 0) {
      if (func.length === 2) {
        func(error, callback)
      } else {
        func(error, context, callback)
      }
    } else {
      setupTimeout.call(this, func, error, context, callback)
    }
  }
}

function setupTimeout (func, rootError, context, callback) {
  const name = func.name
  debug('setting up ready timeout', name, this._timeout)
  let timer = setTimeout(() => {
    debug('timed out', name)
    timer = null
    const toutError = new AVV_ERR_READY_TIMEOUT(name)
    toutError.fn = func
    this._error = toutError
    callback(toutError)
  }, this._timeout)

  if (func.length === 2) {
    func(rootError, timeoutCallback.bind(this))
  } else {
    func(rootError, context, timeoutCallback.bind(this))
  }

  function timeoutCallback (error) {
    if (timer) {
      clearTimeout(timer)
      this._error = error
      callback(this._error)
    } else {
      // timeout has been triggered
      // can not call callback twice
    }
  }
}

function closeWithCallbackOrNextTick (func, callback) {
  const context = this._instance
  const isOnCloseHandler = func[this._isOnCloseHandlerKey]
  if (func.length === 0 || func.length === 1) {
    let promise
    if (isOnCloseHandler) {
      promise = func(context)
    } else {
      promise = func(this._error)
    }
    if (promise && typeof promise.then === 'function') {
      debug('resultolving close/onClose promise')
      promise.then(
        () => process.nextTick(callback),
        (e) => process.nextTick(callback, e))
    } else {
      process.nextTick(callback)
    }
  } else if (func.length === 2) {
    if (isOnCloseHandler) {
      func(context, callback)
    } else {
      func(this._error, callback)
    }
  } else {
    if (isOnCloseHandler) {
      func(context, callback)
    } else {
      func(this._error, context, callback)
    }
  }
}

function encapsulateTwoParam (func, that) {
  return _encapsulateTwoParam.bind(that)
  function _encapsulateTwoParam (context, callback) {
    let result
    if (func.length === 0) {
      result = func()
      if (result && result.then) {
        result.then(function () {
          process.nextTick(callback)
        }, callback)
      } else {
        process.nextTick(callback)
      }
    } else if (func.length === 1) {
      result = func(this)

      if (result && result.then) {
        result.then(function () {
          process.nextTick(callback)
        }, callback)
      } else {
        process.nextTick(callback)
      }
    } else {
      func(this, callback)
    }
  }
}

function encapsulateThreeParam (func, that) {
  return _encapsulateThreeParam.bind(that)
  function _encapsulateThreeParam (error, callback) {
    let result
    if (!func) {
      process.nextTick(callback)
    } else if (func.length === 0) {
      result = func()
      if (result && result.then) {
        result.then(function () {
          process.nextTick(callback, error)
        }, callback)
      } else {
        process.nextTick(callback, error)
      }
    } else if (func.length === 1) {
      result = func(error)
      if (result && result.then) {
        result.then(function () {
          process.nextTick(callback)
        }, callback)
      } else {
        process.nextTick(callback)
      }
    } else if (func.length === 2) {
      func(error, callback)
    } else {
      func(error, this, callback)
    }
  }
}
