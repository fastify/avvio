'use strict'

const { Plugin } = require('./lib/plugin')
const { isPromiseLike, withResolvers } = require('./lib/promise')
const { kContext, kOptions, kExpose, kAvvio, kPluginRoot, kAddPlugin, kStart, kPluginQueue, kError, kLoadPlugin, kLoadPluginNext, kReadyQueue, kCloseQueue, kOnCloseFunction, kWrappedThen } = require('./lib/symbols')
const { resolveBundledFunction, noop } = require('./lib/utils')
const EventEmitter = require('node:events').EventEmitter
const inherits = require('node:util').inherits
const fastq = require('fastq')
const { readyWorker, closeWorker } = require('./lib/workers')
const { AVV_ERR_CALLBACK_NOT_FN } = require('./lib/errors')

/**
 *
 * @signature `Avvio()`
 * @signature `Avvio(done)`
 * @signature `Avvio(instance, done)`
 * @signature `Avvio(instance, options, done)`
 * @param {object} [instance] The instance to be exposed with Avvio methods.
 * @param {*} [options] Options to change the behavior.
 * @param {Function} [done] Function that called when ready.
 * @returns {Avvio}
 *
 * @example <caption>Boot without any params</caption>
 * const avvio = Avvio()
 * avvio.ready()
 *
 * @example <caption>Boot with instance</caption>
 * const server = {}
 * const avvio = Avvio(server)
 * avvio.ready()
 *
 * @example <caption>Boot with callback</caption>
 * const avvio = Avvio(function() {
 *   console.log('ready')
 * })
 */
function Avvio (instance, options, done) {
  // supports multiple signatures
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

  options ??= {}
  const o = {
    autostart: options.autostart !== false,
    timeout: Number(options.timeout) || 0,
    expose: options.expose ?? {}
  }

  // allows to use without new
  if (!new.target) {
    return new Avvio(instance, o, done)
  }

  this[kContext] = instance ?? this
  this[kOptions] = options

  // override instance when it is suppied
  if (instance) {
    this[kExpose]()
  }

  // prevent memory leak warning
  this.setMaxListeners(0)

  if (done) {
    this.once('start', done)
  }

  this[kReadyQueue] = fastq(this, readyWorker, 1)
  this[kReadyQueue].pause()
  this[kReadyQueue].drain = () => {
    this.emit('start')
    // prevent emit multiple start event
    this[kReadyQueue].drain = noop
  }

  this[kCloseQueue] = fastq(this, closeWorker, 1)
  this[kCloseQueue].pause()
  this[kCloseQueue].drain = () => {
    this.emit('close')
    // prevent emit multiple close event
    this[kCloseQueue].drain = noop
  }

  // status
  this.started = false // true when called start
  this.booted = false // true when ready

  this[kPluginQueue] = []
  this[kStart] = null
  this[kError] = null

  const self = this
  this[kPluginRoot] = new Plugin(
    fastq(this, this[kLoadPluginNext], 1),
    function root (_, options, done) {
      self[kStart] = done
      options.autostart && self.start()
    },
    options,
    0
  )

  this[kLoadPlugin](this[kPluginRoot], (error) => {
    try {
      this.emit('preReady')
      this[kPluginRoot] = null
    } catch (preReadyError) {
      error = error ?? this[kError] ?? preReadyError
    }

    if (error) {
      this[kError] = error
      if (this[kReadyQueue].length() === 0) {
        throw error
      }
    } else {
      this.booted = true
    }
    this[kReadyQueue].resume()
  })
}

inherits(Avvio, EventEmitter)

Avvio.prototype.start = function start () {
  this.started = true

  process.nextTick(this[kStart])

  // allows method chaining
  return this
}

Avvio.prototype.ready = function ready (fn) {
  if (fn) {
    if (typeof fn !== 'function') {
      throw AVV_ERR_CALLBACK_NOT_FN('ready', typeof fn)
    }
    this[kReadyQueue].push(fn)
    queueMicrotask(this.start.bind(this))
    return this
  } else {
    const promise = withResolvers()
    const lastContext = this[kPluginQueue][0].context
    this[kReadyQueue].push(function ready (error, context, done) {
      if (error) {
        promise.reject(error)
      } else {
        promise.resolve(lastContext)
      }
      process.nextTick(done)
    })
    queueMicrotask(this.start.bind(this))
    return promise.promise
  }
}

/**
 * onClose registered in reverse order.
 *
 * @param {Function} fn
 * @returns
 */
Avvio.prototype.onClose = function onClose (fn) {
  if (typeof fn !== 'function') {
    throw AVV_ERR_CALLBACK_NOT_FN('onClose', typeof fn)
  }

  // used to distinguish between onClose and close
  fn[kOnCloseFunction] = true
  this[kCloseQueue].unshift(fn, (error) => { error && (this[kError] = error) })

  return this
}

/**
 * close registered in sequantial order
 *
 * @param {Function} fn
 * @returns
 */
Avvio.prototype.close = function close (fn) {
  const resolvers = withResolvers()

  if (fn) {
    if (typeof fn !== 'function') {
      throw AVV_ERR_CALLBACK_NOT_FN('close', typeof fn)
    }
  } else {
    fn = function close (error) {
      if (error) {
        resolvers.reject(error)
      } else {
        resolvers.resolve()
      }
    }
  }

  // we need to start and fininalize before closing
  this.ready(() => {
    this.emit('preClose')
    this[kError] = null
    this[kCloseQueue].push(fn)
    process.nextTick(this[kCloseQueue].resume.bind(this[kCloseQueue]))
  })

  return resolvers.promise
}

Avvio.prototype.use = function use (plugin, options) {
  this[kAddPlugin](plugin, options)
  // allows method chaining
  return this
}

Avvio.prototype.override = function (context, fn, options) {
  return context
}

Object.defineProperties(Avvio.prototype, {
  then: {
    get () {
      // when instance is ready, there is nothing
      // to await.
      if (this.booted) {
        return
      }

      // to prevent recursion of promise resolving
      // due to resolve(this[kContext]), we need
      // an indicator to break the recursion.
      if (this[kWrappedThen]) {
        this[kWrappedThen] = false
        return
      }

      const plugin = this[kPluginQueue][0]
      const needToStart = !this.started && !this.booted

      // if the root plugin is not loaded, resume
      if (needToStart) {
        process.nextTick(() => {
          this[kPluginRoot].queue.resume()
        })
      }

      let promise = null

      if (!plugin) {
        // when no plugin is registered,
        // immediately resolve
        promise = Promise.resolve(this[kContext])
      } else {
        // wait until the plugin is fully loaded.
        promise = plugin.promise()
      }

      return (resolve, reject) => promise.then(() => {
        this[kWrappedThen] = true
        return resolve(this[kContext])
      }, reject)
    }
  }
})

/**
 * Used to identify the Avvio instance
 * and skip some logic when appropriate
 */
Avvio.prototype[kAvvio] = true

Avvio.prototype[kExpose] = function expose () {
  const self = this
  const instance = this[kContext]
  const {
    use: useKey = 'use'
  } = this[kOptions].expose

  if (instance[useKey]) {
    throw Error()
  }
  instance[useKey] = function (fn, options) {
    self.use(fn, options)
    return this
  }

  instance[kAvvio] = true
}

Avvio.prototype[kAddPlugin] = function (fn, options) {
  fn = resolveBundledFunction(fn)
  Plugin.validate(fn)

  options = options ?? {}

  if (this.booted) {
    throw Error()
  }

  const parent = this[kPluginQueue][0]

  let timeout = this[kOptions].timeout

  if (!parent.loaded && parent.timeout > 0) {
    const delta = Date.now() - parent.startTime
    // decrease the timeout by 3ms to ensure the child
    // timeout is triggered earlier than parent
    timeout = parent.timeout - (delta + 3)
  }

  const plugin = new Plugin(
    fastq(this, this[kLoadPluginNext], 1),
    fn,
    options,
    timeout
  )

  if (parent.loaded) {
    throw Error(plugin.name, parent.name)
  }

  parent.enqueue(plugin, (error) => { error && (this[kError] = error) })

  return plugin
}

Avvio.prototype[kLoadPlugin] = function (plugin, callback) {
  const self = this
  if (isPromiseLike(plugin.fn)) {
    plugin.fn.then((fn) => {
      fn = resolveBundledFunction(fn)
      plugin.fn = fn
      this[kLoadPlugin](plugin, callback)
    }, callback)
    return
  }

  // prev added plugin
  const prev = self[kPluginQueue][0]
  self[kPluginQueue].unshift(plugin)

  let context = prev?.context ?? self[kContext]
  try {
    context = self.override(context, plugin.fn, plugin.options)
  } catch (overrideError) {
    return executeCallback(overrideError)
  }

  plugin.execute(context, executeCallback)

  function executeCallback (error) {
    plugin.finish(error, (error) => {
      self[kPluginQueue].shift()
      callback(error)
    })
  }
}

Avvio.prototype[kLoadPluginNext] = function (plugin, callback) {
  process.nextTick(this[kLoadPlugin].bind(this), plugin, callback)
}

/**
 * supports the following import
 * 1. const Avvio = require('avvio')
 * 2. const { Avvio } = require('avvio')
 * 3. const { default: Avvio } = require('avvio')
 * 4. import Avvio from 'avvio'
 * 5. import { Avvio } from 'avvio'
 * 6. import { default as Avvio } from 'avvio'
 */
module.exports = Avvio
module.exports.default = Avvio
module.exports.Avvio = Avvio
