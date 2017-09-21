'use strict'

const fastq = require('fastq')

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
  this.server = this.parent.override(server, func, this.opts)

  // we must defer the loading of the plugin until the
  // current execution has ended
  process.nextTick(() => {
    func(this.server, this.opts, cb)
  })
}

Plugin.prototype.finish = function (err, cb) {
  const callback = this.callback
  // if 'use' has a callback
  if (callback) {
    callback(err)
    // if 'use' has a callback but does not have parameters
    cb(callback.length > 0 ? null : err)
  } else {
    cb(err)
  }
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

module.exports = Plugin
module.exports.loadPlugin = loadPlugin
