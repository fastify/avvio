'use strict'

/**
 * @callback LoadPluginCallback
 * @param {Error} [err]
 */

/**
 * Load a plugin
 *
 * @param {*} instance
 * @param {*} plugin
 * @param {LoadPluginCallback} callback
 */
function loadPlugin (instance, plugin, callback) {
  if (typeof plugin.func.then === 'function') {
    plugin.func.then((fn) => {
      if (typeof fn.default === 'function') {
        fn = fn.default
      }
      plugin.func = fn
      loadPlugin(instance, plugin, callback)
    }, callback)
    return
  }

  const last = instance._current[0]

  // place the plugin at the top of _current
  instance._current.unshift(plugin)

  plugin.exec((last && last.server) || instance._server, (err) => {
    plugin.finish(err, (err) => {
      instance._current.shift()
      callback(err)
    })
  })
}

module.exports = {
  loadPlugin
}
