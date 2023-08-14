'use strict'

const { debuglog } = require('util')

/**
 * @callback DebugLogger
 * @param {string} msg
 * @param {...unknown} param
 * @returns {void}
 */

/**
 * @type {DebugLogger}
 */
const debug = debuglog('avvio')

module.exports = {
  debug
}
