'use strict'

/**
 * @typedef PromiseObject
 * @property {Promise} promise
 * @property {PromiseConstructor["resolve"]} resolve
 * @property {PromiseConstructor["reject"]} reject
 */

/**
 * @returns {PromiseObject}
 */
function createPromise () {
  /**
     * @type {PromiseObject}
     */
  const obj = {
    resolve: null,
    reject: null,
    promise: null
  }

  obj.promise = new Promise((resolve, reject) => {
    obj.resolve = resolve
    obj.reject = reject
  })

  return obj
}

module.exports = {
  createPromise
}
