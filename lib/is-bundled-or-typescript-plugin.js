'use strict'

function isBundledOrTypescriptPlugin (plugin) {
  return plugin !== null && typeof plugin === 'object' && typeof plugin.default === 'function'
}

module.exports = {
  isBundledOrTypescriptPlugin
}
