'use strict'

const fastq = require('fastq')
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

  this._queue = fastq(server, function (toLoad, cb) {
    process.nextTick(toLoad.plugin, server, toLoad.opts, cb)
  }, 1)

  if (done) {
    this.on('start', done)
  }

  this._queue.drain = () => {
    this.emit('start')
  }

  this.use(nooplugin)
}

inherits(Boot, EE)

Boot.prototype.use = function (plugin, opts) {
  opts = opts || {}
  this._queue.push({
    plugin,
    opts
  })
}

function nooplugin (s, o, done) {
  done()
}

module.exports = Boot
