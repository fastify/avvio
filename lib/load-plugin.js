'use strict'

const { debug } = require('./debug')
const { isPromiseLike } = require('./is-promise-like')

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
  if (isPromiseLike(plugin.func)) {
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

  if (instance._error && !plugin.isAfter) {
    debug('skipping loading of plugin as instance errored and it is not an after', plugin.name)
    process.nextTick(execCallback)
    return
  }

  let server = (last && last.server) || instance._server

  if (!plugin.isAfter) {
    // Skip override for after
    try {
      server = instance.override(server, plugin.func, plugin.options)
    } catch (overrideErr) {
      debug('override errored', plugin.name)
      return execCallback(overrideErr)
    }
  }

  plugin.exec(server, execCallback)

  function execCallback (err) {
    plugin.finish(err, (err) => {
      instance._current.shift()
      callback(err)
    })
  }
}

module.exports = {
  loadPlugin
}
