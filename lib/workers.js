'use strict'

const { kContext, kError, kOptions, kOnCloseFunction } = require('./symbols')
const { executeFn } = require('./utils')

/**
 *
 * @param {Function} fn ready function
 * @param {Function} done indicate the current task is done
 */
module.exports.readyWorker = function readyWorker (fn, done) {
  const context = this[kContext]
  const error = this[kError]

  // prevent the error appear outside of the next ready callback
  this[kError] = null

  if (this[kOptions].timeout === 0) {
    executeFn(fn, [error, context], (error) => {
      this[kError] = error
      done(this[kError])
    })
  } else {
    let timerId = setTimeout(() => {
      timerId = null
      this[kError] = Error()
      done(this[kError])
    }, this[kOptions].timeout)

    executeFn(fn, [error, context], (error) => {
      if (timerId) {
        clearTimeout(timerId)
        this[kError] = error
        done(this[kError])
      }
    })
  }
}

/**
 *
 * @param {Function} fn
 * @param {Function} done
 */
module.exports.closeWorker = function closeWorker (fn, done) {
  const context = this[kContext]
  const error = this[kError]

  // close worker is shared between, onClose and close
  // the arguments accepted by two function is different
  const isOnCloseFn = fn[kOnCloseFunction]
  const args = isOnCloseFn
    ? [context]
    : [error, context]

  executeFn(fn, args, done)
}
