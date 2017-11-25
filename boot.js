'use strict'

const fastq = require('fastq')
const EE = require('events').EventEmitter
const inherits = require('util').inherits
const Plugin = require('./plugin')
const debug = require('debug')('avvio')

function wrap (server, opts, instance) {
  const expose = opts.expose || {}
  const useKey = expose.use || 'use'
  const afterKey = expose.after || 'after'
  const readyKey = expose.ready || 'ready'
  const onCloseKey = expose.onClose || 'onClose'
  const closeKey = expose.close || 'close'

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

  server[afterKey] = function (func) {
    if (typeof func !== 'function') {
      throw new Error('not a function')
    }
    instance.after(encapsulateThreeParam(func, this))
    return this
  }

  server[readyKey] = function (func) {
    if (typeof func !== 'function') {
      throw new Error('not a function')
    }
    instance.ready(encapsulateThreeParam(func, this))
    return this
  }

  server[onCloseKey] = function (func) {
    if (typeof func !== 'function') {
      throw new Error('not a function')
    }
    instance.onClose(encapsulateTwoParam(func, this))
    return this
  }

  server[closeKey] = function (func) {
    if (func && typeof func !== 'function') {
      throw new Error('not a function')
    }
    instance.close(encapsulateThreeParam(func, this))
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
  this._error = null

  if (done) {
    this.once('start', done)
  }

  this.booted = false

  this._readyQ = fastq(this, callWithCbOrNextTick, 1)
  this._readyQ.pause()
  this._readyQ.drain = () => {
    this.booted = true
    this.emit('start')
  }

  this._closeQ = fastq(this, closeWithCbOrNextTick, 1)
  this._closeQ.pause()
  this._closeQ.drain = () => {
    this.emit('close')
  }
  this._thereIsCloseCb = false

  // we init, because we need to emit "start" if no use is called
  this._init()
}

inherits(Boot, EE)

Boot.prototype._init = function () {
  if (this.booted) {
    throw new Error('root plugin has already booted')
  }

  if (this._current.length === 0) {
    const main = new Plugin(this, function root (s, opts, done) {
      // we need to wait any call to use() to happen
      process.nextTick(done)
    }, {}, noop)
    Plugin.loadPlugin.call(this, main, (err) => {
      debug('root plugin ready')
      if (err) {
        this._error = err
        if (this._readyQ.length() === 0) {
          throw err
        }
      } else {
        this._readyQ.resume()
      }
    })
  }
}

// allows to override the instance of a server, given a plugin
Boot.prototype.override = function (server, func, opts) {
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
  callback = callback || null

  // we reinit, if use is called after emitting start once
  this._init()

  // we always add plugins to load at the current element
  const current = this._current[0]

  const obj = new Plugin(this, plugin, opts, callback)

  if (current.loaded) {
    throw new Error(`Impossible to load "${obj.name}" plugin because the parent "${current.name}" was already loaded`)
  }

  // we add the plugin to be loaded at the end of the current queue
  current.enqueue(obj, (err) => {
    if (err) {
      this._error = err
    }
  })
}

Boot.prototype.after = function (func, cb) {
  this.use(_after.bind(this), cb)

  function _after (s, opts, done) {
    callWithCbOrNextTick.call(this, func, done)
  }

  return this
}

Boot.prototype.wait = function () {
  return new Promise((resolve, reject) => {
    this.use(_wait.bind(this))

    function _wait (s, opts, done) {
      process.nextTick(done)
      var err = this._error
      this._error = null
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    }
  })
}

Boot.prototype.onClose = function (func) {
  this._closeQ.unshift(func, callback.bind(this))

  function callback (err) {
    if (err) this._error = err
  }

  return this
}

Boot.prototype.close = function (func) {
  this._error = null
  if (func) {
    if (typeof func !== 'function') {
      throw new Error('not a function')
    }
    this._closeQ.push(func)
    this._thereIsCloseCb = true
  }
  process.nextTick(this._closeQ.resume.bind(this._closeQ))
}

Boot.prototype.ready = function (func) {
  this._readyQ.push(func)
  return this
}

function noop () {}

function callWithCbOrNextTick (func, cb, context) {
  context = this._server
  var err = this._error

  // with this the error will appear just in the next after/ready callback
  this._error = null
  if (func.length === 0) {
    this._error = err
    func()
    process.nextTick(cb)
  } else if (func.length === 1) {
    func(err)
    process.nextTick(cb)
  } else if (func.length === 2) {
    func(err, cb)
  } else {
    func(err, context, cb)
  }
}

function closeWithCbOrNextTick (func, cb, context) {
  context = this._server
  if (this._closeQ.length() === 0 && this._thereIsCloseCb) {
    if (func.length === 0 || func.length === 1) {
      func(this._error)
      process.nextTick(cb)
    } else if (func.length === 2) {
      func(this._error, cb)
    } else {
      func(this._error, context, cb)
    }
  } else {
    if (func.length === 0 || func.length === 1) {
      func(context)
      process.nextTick(cb)
    } else {
      func(context, cb)
    }
  }
}

function encapsulateTwoParam (func, that) {
  return _encapsulateTwoParam.bind(that)
  function _encapsulateTwoParam (context, cb) {
    if (func.length === 0 || func.length === 1) {
      func(this)
      process.nextTick(cb)
    } else {
      func(this, cb)
    }
  }
}

function encapsulateThreeParam (func, that) {
  return _encapsulateThreeParam.bind(that)
  function _encapsulateThreeParam (err, cb) {
    if (!func) {
      process.nextTick(cb)
    } else if (func.length === 0 || func.length === 1) {
      func(err)
      process.nextTick(cb)
    } else if (func.length === 2) {
      func(err, cb)
    } else {
      func(err, this, cb)
    }
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
