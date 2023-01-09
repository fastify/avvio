'use strict'

const { kAvvio, kThenifyDoNotWrap } = require('./symbols')
const { debug } = require('./debug')

function executeWithThenable (func, args, callback) {
  const result = func(...args)
  if (result && !result[kAvvio] && typeof result.then === 'function') {
    // process promise but not avvio mock thenable
    result.then(() => process.nextTick(callback), (error) => process.nextTick(callback, error))
  } else if (callback) {
    process.nextTick(callback)
  }
}

function thenify () {
  // If the instance is ready, then there is
  // nothing to await. This is true during
  // await server.ready() as ready() resolves
  // with the server, end we will end up here
  // because of automatic promise chaining.
  if (this.booted) {
    debug('thenify returning null because we are already booted')
    return
  }

  // Calling resolve(this._instance) would fetch the then
  // property on the server, which will lead it here.
  // If we do not break the recursion, we will loop
  // forever.
  if (this[kThenifyDoNotWrap]) {
    this[kThenifyDoNotWrap] = false
    return
  }

  debug('thenify')
  return (resolve, reject) => {
    const p = this._loadRegistered()
    return p.then(() => {
      this[kThenifyDoNotWrap] = true
      return resolve(this._instance)
    }, reject)
  }
}

module.exports = {
  thenify,
  executeWithThenable
}
