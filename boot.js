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

  this._queue = fastq(server, (toLoad, cb) => {
    const func = toLoad.plugin
    func(server, toLoad.opts, (err) => {
      // schedule all tasks left in the batch
      clear(this)

      // always delay the next task
      process.nextTick(cb, err)
    })
  }, 1)

  if (done) {
    this.on('start', done)
  }

  this._queue.drain = () => {
    this.emit('start')
  }

  this._batch = []
  this.use(nooplugin)

  process.nextTick(clear, this)
}

inherits(Boot, EE)

Boot.prototype.use = function (plugin, opts) {
  opts = opts || {}

  const obj = {
    plugin,
    opts
  }

  this._batch.push(obj)
}

// add all element in the batch at the top of the
// queue, in the order that they are called with use()
function clear (boot) {
  const batch = boot._batch

  // we need to pause, otherwise one of the jobs might be triggered
  // and we will trigger the wrong one, because we are adding them
  // at the top
  boot._queue.pause()
  let obj
  while ((obj = batch.pop()) !== undefined) {
    boot._queue.unshift(obj)
  }
  boot._queue.resume()
}

function nooplugin (s, o, done) {
  done()
}

module.exports = Boot
