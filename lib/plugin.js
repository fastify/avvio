'use strict'

const EventEmitter = require('node:events').EventEmitter
const inherits = require('node:util').inherits
const { withResolvers } = require('./promise')
const { resolvePluginName, noop, executeFn } = require('./utils')

// Plugin is used to manage encapsulation levels

function Plugin (queue, fn, options, timeout) {
  this.queue = queue
  this.fn = fn
  this.options = options
  this.timeout = timeout

  this.queue.pause()

  // status
  this.context = null
  this.contextName = null
  this.name = resolvePluginName(fn, options)
  this.error = null
  this.started = false
  this.startTime = null
  this.loaded = false
  this.resolvers = null
}

inherits(Plugin, EventEmitter)

// static function
Plugin.validate = function validate (maybePlugin) {
  if (!(maybePlugin && (typeof maybePlugin === 'function' || typeof maybePlugin.then === 'function'))) {
    if (Array.isArray(maybePlugin)) {
      throw Error()
    } else if (maybePlugin === null) {
      throw Error()
    } else {
      throw Error()
    }
  }
}

Plugin.prototype.execute = function execute (context, callback) {
  this.context = context
  this.contextName = context ? context.name : null
  // resolve function options
  this.options = typeof this.options === 'function' ? this.options(context) : this.options

  const {
    fn,
    name,
    timeout
  } = this
  let completed = false
  let timerId = null

  const done = (executeError) => {
    // prevent execute twice
    if (completed) {
      return
    }

    this.error = executeError

    completed = true

    if (timerId) {
      clearTimeout(timerId)
    }

    callback(executeError)
  }

  if (timeout > 0) {
    timerId = setTimeout(function () {
      timerId = null
      done(Error())
    }, timeout)
  }

  // execute the fn
  this.started = true
  this.startTime = Date.now()
  this.emit('start', this.contextName, name, this.startTime)
  executeFn(fn, [context, this.options], done)
}

Plugin.prototype.enqueue = function enqueue (plugin, callback) {
  this.emit('enqueue', this.contextName, this.name, Date.now())
  this.queue.push(plugin, callback)
}

Plugin.prototype.finish = function finish (error, callback) {
  const done = () => {
    if (this.loaded) {
      return
    }

    this.emit('loaded', this.contextName, this.name, Date.now())
    this.loaded = true

    callback(error)
  }

  if (error) {
    this.reject(error)
    done()
    return
  }

  const check = () => {
    if (this.queue.length() === 0 && this.queue.running() === 0) {
      if (this.resolvers) {
        function queue () {
          queueMicrotask(check)
        }
        this.resolve().then(queue, queue)
      } else {
        done()
      }
    } else {
      this.queue.drain = () => {
        this.queue.drain = noop
        queueMicrotask(check)
      }
    }
  }

  queueMicrotask(check)
  this.queue.resume()
}

Plugin.prototype.promise = function promise () {
  if (this.loaded) {
    return Promise.resolve()
  }

  this.queue.resume()

  if (!this.resolvers) {
    this.resolvers = withResolvers()
  }

  return this.resolvers.promise
}

Plugin.prototype.resolve = function resolve () {
  if (this.resolvers) {
    const resolvers = this.resolvers
    resolvers.resolve()
    this.resolvers = null
    return resolvers.promise
  }
}

Plugin.prototype.reject = function reject (error) {
  if (this.resolvers) {
    const resolvers = this.resolvers
    resolvers.reject(error)
    this.resolvers = null
    return resolvers.promise
  }
}

module.exports.Plugin = Plugin
