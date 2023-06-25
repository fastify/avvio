'use strict'

const { AVV_ERR_PLUGIN_NOT_VALID } = require('./errors')

/**
 * @param {unknown} plugin
 * @throws {AVV_ERR_PLUGIN_NOT_VALID}
 * @returns {Function}
 */
function validatePlugin (plugin) {
  // validate if plugin is a function or Promise
  if (!(plugin && (typeof plugin === 'function' || typeof plugin.then === 'function'))) {
    if (Array.isArray(plugin)) {
      throw new AVV_ERR_PLUGIN_NOT_VALID('array')
    } else if (plugin === null) {
      throw new AVV_ERR_PLUGIN_NOT_VALID('null')
    } else {
      throw new AVV_ERR_PLUGIN_NOT_VALID(typeof plugin)
    }
  }
}

module.exports = {
  validatePlugin
}
