'use strict'

const fastseries = require('fastseries')
const EE = require('events').EventEmitter
const inherits = require('inherits')

function Boot (server, done) {
  if (!(this instanceof Boot)) {
    return new Boot(server, done)
  }

  if (typeof server === 'function') {
    done = server
    server = null
  }

  server = server || this

  this._series = fastseries()

  this._current = null

  this._process = (toLoad, cb) => {
    const func = toLoad.plugin
    this._current = toLoad
    this._current.onFinish = cb
    func(server, toLoad.opts, (err) => {
      if (err) {
        toLoad.callback(err)
        process.nextTick(cb, err)
        return
      }

      if (!toLoad.deferred) {
        this._current = null
        process.nextTick(clear, this, (err) => {
          if (err) {
            this.emit('error', err)
          }
          toLoad.callback(err)
          cb(err)
        })
      }
    })
  }

  if (done) {
    this.on('start', done)
  }

  this._batch = []

  // always trigger start in the next tick
  // if no "use" is called first
  process.nextTick(clear, this, (err) => {
    if (err) {
      this.emit('error', err)
    } else {
      this.emit('start')
    }
  })
}

inherits(Boot, EE)

Boot.prototype.use = function (plugin, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = null
  }
  opts = opts || {}
  callback = callback || noop
  const current = this._current

  const obj = {
    plugin,
    opts,
    callback,
    deferred: false
  }

  // defer finishing off the current element
  if (current && !current.deferred) {
    current.deferred = true
    process.nextTick(clear, this, (err) => {
      if (err) {
        this.emit('error', err)
      }
      current.callback(err)
      current.onFinish(err)
    })
  }

  this._batch.push(obj)
}

// executes all elements in the batch in series
function clear (boot, cb) {
  const batch = boot._batch
  boot._batch = []

  cb = cb || noop

  boot._series(boot, boot._process, batch, cb)
}

function noop () {}

module.exports = Boot
