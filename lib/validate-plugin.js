'use strict'

const { AVV_ERR_PLUGIN_NOT_VALID } = require('./errors')
const { isBundledOrTypescriptPlugin } = require('./is-bundled-or-typescript-plugin')

function validatePlugin (plugin) {
  if (isBundledOrTypescriptPlugin(plugin)) {
    plugin = plugin.default
  }

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
