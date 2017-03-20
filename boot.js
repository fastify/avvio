'use strict'

const fastq = require('fastq')
const EE = require('events').EventEmitter
const inherits = require('util').inherits

function wrap (server, opts, instance) {
  const expose = opts.expose || {}
  const useKey = expose.use || 'use'
  const afterKey = expose.after || 'after'
  const readyKey = expose.ready || 'ready'

  if (server[useKey]) {
    throw new Error(useKey + '() is already defined, specify an expose option')
  }

  if (server[afterKey]) {
    throw new Error(afterKey + '() is already defined, specify an expose option')
  }

  if (server[readyKey]) {
    throw new Error(readyKey + '() is already defined, specify an expose option')
  }

  server[useKey] = function (a, b, c) {
    instance.use(a, b, c)
    return this
  }

  server[afterKey] = function (cb) {
    instance.after(cb)
    return this
  }

  server[readyKey] = function (cb) {
    instance.after(cb)
    return this
  }
}

function Boot (server, opts, done) {
  if (typeof server === 'function' && arguments.length === 1) {
    done = server
    opts = {}
    server = null
  }

  if (typeof opts === 'function') {
    done = opts
    opts = {}
  }

  opts = opts || {}

  if (!(this instanceof Boot)) {
    const instance = new Boot(server, opts, done)

    if (server) {
      wrap(server, opts, instance)
    }

    return instance
  }

  server = server || this

  this._server = server
  this._current = []

  if (done) {
    this.once('start', done)
  }

  /* function readyQIterator (func, cb) {
    callWithCbOrNextTick(func, cb, server)
  } */
  this._readyQ = fastq(this, callWithCbOrNextTick, 1)
  this._readyQ.pause()
  this._readyQ.drain = () => {
    this.emit('start')
  }

  // we init, because we need to emit "start" if no use is called
  this._init()
}

inherits(Boot, EE)

// create the root node upon to hold each subsequent call to use()
// the root node is responsible for emitting 'start'
Boot.prototype._init = function () {
  if (this._current.length === 0) {
    const main = new Plugin(this, (s, opts, done) => {
      // we need to wait any call to use() to happen
      process.nextTick(done)
    }, {}, noop)
    loadPlugin.call(this, main, (err) => {
      if (err) {
        this.emit('error', err)
      } else if (this._readyQ.length() > 0) {
        this._readyQ.resume()
      } else {
        this.emit('start')
      }
    })
  }
}

// allows to override the instance of a server, given a plugin
Boot.prototype.override = function (server, func) {
  return server
}

// load a plugin
Boot.prototype.use = function (plugin, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = null
  }

  if (typeof plugin === 'function') {
    this._addPlugin(plugin, opts, callback)
  } else if (Array.isArray(plugin)) {
    for (var i = 0; i < plugin.length; i++) {
      this._addPlugin(plugin[i], opts, callback)
    }
  } else {
    throw new Error('plugin must be a function')
  }

  return this
}

Boot.prototype._addPlugin = function (plugin, opts, callback) {
  if (typeof plugin !== 'function') {
    throw new Error('plugin must be a function')
  }
  opts = opts || {}
  callback = callback || noop

  // we reinit, if use is called after emitting start once
  this._init()

  // we always add plugins to load at the current element
  const current = this._current[0]

  const obj = new Plugin(this, plugin, opts, callback)

  // we add the plugin to be loaded at the end of the current queue
  current.q.push(obj, (err) => {
    if (err) {
      this.emit('error', err)
    }
  })
}

Boot.prototype.after = function (func, cb) {
  // TODO do not rely on .use()
  // const server = this._server
  this.use(function (s, opts, done) {
    callWithCbOrNextTick.call(this, func, done)
  }.bind(this), cb)
  return this
}

Boot.prototype.ready = function (func) {
  this._readyQ.push(func)
  return this
}

function noop () {}

function Plugin (parent, func, opts, callback) {
  this.func = func
  this.opts = opts
  this.callback = callback
  this.deferred = false
  this.onFinish = null
  this.parent = parent
  this.skipOverride = !!func[Symbol.for('skip-override')]

  this.q = fastq(parent, loadPlugin, 1)
  this.q.pause()

  // always start the queue in the next tick
  // because we try to attach subsequent call to use()
  // to the right plugin. we need to defer them,
  // or they will end up at the top of _current
  process.nextTick(this.q.resume.bind(this.q))
}

Plugin.prototype.exec = function (server, cb) {
  const func = this.func
  this.server = this.skipOverride ? server : this.parent.override(server, func)
  func(this.server, this.opts, cb)
}

Plugin.prototype.finish = function (err, cb) {
  const callback = this.callback
  callback(err)
  cb(err)
}

// loads a plugin
function loadPlugin (toLoad, cb) {
  const last = this._current[0]
  // place the plugin at the top of _current
  this._current.unshift(toLoad)
  toLoad.exec((last && last.server) || this._server, (err) => {
    if (err || !(toLoad.q.length() > 0 || toLoad.q.running() > 0)) {
      // finish now, because there is nothing left to do
      this._current.shift()
      toLoad.finish(err, cb)
    } else {
      // finish when the queue of nested plugins to load is empty
      toLoad.q.drain = () => {
        this._current.shift()
        toLoad.finish(null, cb)
      }
    }
  })
}

function callWithCbOrNextTick (func, cb, context) {
  if (this && this._server) {
    context = this._server
  }

  if (func.length === 0) {
    func()
    process.nextTick(cb)
  } else if (func.length === 1) {
    func(cb)
  } else {
    func(context, cb)
  }
}

module.exports = Boot
module.exports.express = function (app) {
  return Boot(app, {
    expose: {
      use: 'load'
    }
  })
}
