'use strict'

const fastq = require('fastq')
const EE = require('events').EventEmitter
const inherits = require('util').inherits

function Boot (server, done) {
  if (!(this instanceof Boot)) {
    return new Boot(server, done)
  }

  if (typeof server === 'function') {
    done = server
    server = null
  }

  server = server || this

  this._server = server
  this._current = []

  if (done) {
    this.once('start', done)
  }

  this._readyQ = fastq(this, doReady, 1)
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

// load a plugin
Boot.prototype.use = function (plugin, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = null
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
  return this
}

Boot.prototype.after = function (func, cb) {
  // TODO do not rely on .use()
  this.use(function (s, opts, done) {
    if (func.length === 0) {
      func()
      process.nextTick(done)
    } else {
      func(done)
    }
  }, cb)
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
  func(server, this.opts, cb)
}

Plugin.prototype.finish = function (err, cb) {
  const callback = this.callback
  callback(err)
  cb(err)
}

// loads a plugin
function loadPlugin (toLoad, cb) {
  // place the plugin at the top of _current
  this._current.unshift(toLoad)
  toLoad.exec(this._server, (err) => {
    if (err || !(toLoad.q.length() > 0 || toLoad.q.running() > 0)) {
      // finish now, because there is nothing left to do
      this._current.shift()
      toLoad.finish(err, cb)
      return
    } else {
      // finish when the queue of nested plugins to load is empty
      toLoad.q.drain = () => {
        this._current.shift()
        toLoad.finish(null, cb)
      }
    }
  })
}

// executes a Ready thing
function doReady (func, cb) {
  func(cb)
}

module.exports = Boot
