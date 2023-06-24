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
  const obj = {}

  obj.promise = new Promise((resolve, reject) => {
    obj.resolve = resolve
    obj.reject = reject
  })

  return obj
}

module.exports = {
  createPromise
}
