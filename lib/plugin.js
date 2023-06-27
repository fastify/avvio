'use strict'

const fastq = require('fastq')
const { EventEmitter } = require('events')
const inherits = require('util').inherits
const { debug } = require('./debug')
const { loadPlugin } = require('./load-plugin')
const { createPromise } = require('./create-promise')
const { AVV_ERR_READY_TIMEOUT } = require('./errors')
const { getPluginName } = require('./get-plugin-name')
const { isPromiseLike } = require('./is-promise-like')

/**
 * @param {*} parent
 * @param {*} func
 * @param {*} options
 * @param {boolean} isAfter
 * @param {number} [timeout]
 */
function Plugin (parent, func, options, isAfter, timeout) {
  this.parent = parent
  this.func = func
  this.options = options
  /**
   * @type {boolean}
   */
  this.isAfter = isAfter
  /**
   * @type {number}
   */
  this.timeout = timeout

  /**
   * @type {boolean}
   */
  this.started = false
  /**
   * @type {string}
   */
  this.name = getPluginName(func, options)

  /**
   * @type {fastq.queue}
   */
  this.queue = fastq(parent, loadPluginNextTick, 1)
  this.queue.pause()

  /**
   * @type {Error|null}
   */
  this._error = null
  /**
   * @type {boolean}
   */
  this.loaded = false

  this._promise = null
}

inherits(Plugin, EventEmitter)

/**
 * @callback ExecCallback
 * @param {Error|null} execErr
 * @returns
 */

/**
 *
 * @param {*} server
 * @param {ExecCallback} callback
 * @returns
 */
Plugin.prototype.exec = function (server, callback) {
  const func = this.func
  const name = this.name
  let completed = false

  if (this.parent._error && !this.isAfter) {
    debug('skipping loading of plugin as parent errored and it is not an after', name)
    process.nextTick(callback)
    return
  }

  if (!this.isAfter) {
    // Skip override for after
    try {
      this.server = this.parent.override(server, func, this.options)
    } catch (overrideErr) {
      debug('override errored', name)
      return callback(overrideErr)
    }
  } else {
    this.server = server
  }

  this.options = typeof this.options === 'function' ? this.options(this.server) : this.options

  debug('exec', name)

  let timer = null

  /**
   * @param {Error} [execErr]
   */
  const done = (execErr) => {
    if (completed) {
      debug('loading complete', name)
      return
    }

    this._error = execErr

    if (execErr) {
      debug('exec errored', name)
    } else {
      debug('exec completed', name)
    }

    completed = true

    if (timer) {
      clearTimeout(timer)
    }

    callback(execErr)
  }

  if (this.timeout > 0) {
    debug('setting up timeout', name, this.timeout)
    timer = setTimeout(function () {
      debug('timed out', name)
      timer = null
      const readyTimeoutErr = new AVV_ERR_READY_TIMEOUT(name)
      readyTimeoutErr.fn = func
      done(readyTimeoutErr)
    }, this.timeout)
  }

  this.started = true
  this.emit('start', this.server ? this.server.name : null, this.name, Date.now())

  const maybePromiseLike = func(this.server, this.options, done)

  if (isPromiseLike(maybePromiseLike)) {
    debug('exec: resolving promise', name)

    maybePromiseLike.then(
      () => process.nextTick(done),
      (e) => process.nextTick(done, e))
  }
}

/**
 * @returns {Promise}
 */
Plugin.prototype.loadedSoFar = function () {
  if (this.loaded) {
    return Promise.resolve()
  }

  const setup = () => {
    this.server.after((afterErr, callback) => {
      this._error = afterErr
      this.queue.pause()

      if (afterErr) {
        debug('rejecting promise', this.name, afterErr)
        this._promise.reject(afterErr)
      } else {
        debug('resolving promise', this.name)
        this._promise.resolve()
      }
      this._promise = null

      process.nextTick(callback, afterErr)
    })
    this.queue.resume()
  }

  let res

  if (!this._promise) {
    this._promise = createPromise()
    res = this._promise.promise

    if (!this.server) {
      this.on('start', setup)
    } else {
      setup()
    }
  } else {
    res = Promise.resolve()
  }

  return res
}

/**
 * @callback EnqueueCallback
 * @param {Error|null} enqueueErr
 * @param {Plugin} result
 */

/**
 *
 * @param {Plugin} plugin
 * @param {EnqueueCallback} callback
 */
Plugin.prototype.enqueue = function (plugin, callback) {
  debug('enqueue', this.name, plugin.name)
  this.emit('enqueue', this.server ? this.server.name : null, this.name, Date.now())
  this.queue.push(plugin, callback)
}

/**
 * @callback FinishCallback
 * @param {Error|null} finishErr
 * @returns
 */
/**
 *
 * @param {Error|null} err
 * @param {FinishCallback} callback
 * @returns
 */
Plugin.prototype.finish = function (err, callback) {
  debug('finish', this.name, err)
  const done = () => {
    if (this.loaded) {
      return
    }

    debug('loaded', this.name)
    this.emit('loaded', this.server ? this.server.name : null, this.name, Date.now())
    this.loaded = true

    callback(err)
  }

  if (err) {
    if (this._promise) {
      this._promise.reject(err)
      this._promise = null
    }
    done()
    return
  }

  const check = () => {
    debug('check', this.name, this.queue.length(), this.queue.running(), this._promise)
    if (this.queue.length() === 0 && this.queue.running() === 0) {
      if (this._promise) {
        const wrap = () => {
          debug('wrap')
          queueMicrotask(check)
        }
        this._promise.resolve()
        this._promise.promise.then(wrap, wrap)
        this._promise = null
      } else {
        done()
      }
    } else {
      debug('delayed', this.name)
      // finish when the queue of nested plugins to load is empty
      this.queue.drain = () => {
        debug('drain', this.name)
        this.queue.drain = noop

        // we defer the check, as a safety net for things
        // that might be scheduled in the loading callback
        queueMicrotask(check)
      }
    }
  }

  queueMicrotask(check)

  // we start loading the dependents plugins only once
  // the current level is finished
  this.queue.resume()
}

/**
 * Delays plugin loading until the next tick to ensure any bound `_after` callbacks have a chance
 * to run prior to executing the next plugin
 */
function loadPluginNextTick (plugin, callback) {
  process.nextTick(loadPlugin, this, plugin, callback)
}

function noop () {}

module.exports = {
  Plugin
}
