'use strict'

/**
 * bundled or typescript plugin
 * @typedef {object} BundledOrTypescriptPlugin
 * @property {function} default
 */

/**
 * @param {unknown} plugin
 * @returns {plugin is BundledOrTypescriptPlugin}
 */

function isBundledOrTypescriptPlugin (plugin) {
  return plugin !== null && typeof plugin === 'object' && typeof plugin.default === 'function'
}

module.exports = {
  isBundledOrTypescriptPlugin
}
