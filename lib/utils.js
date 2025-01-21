'use strict'

const { isPromiseLike } = require('./promise')
const { kPluginMeta } = require('./symbols')
const promise = require('./promise')

module.exports.noop = function noop () { }

module.exports.resolvePluginName = function resolvePluginName (plugin, options) {
  // use explicit function metadata if available
  if (plugin[kPluginMeta]?.name) {
    return plugin[kPluginMeta].name
  }

  // use explicit name option if available
  if (options?.name) {
    return options.name
  }

  // determine from the function
  if (plugin.name) {
    return plugin.name
  } else {
    // takes the first two lines of the function if nothing else works
    return plugin.toString().split('\n').slice(0, 2).map(s => s.trim()).join(' -- ')
  }
}

module.exports.resolveBundledFunction = function resolveBundledFunction (maybeBundled) {
  if (
    maybeBundled !== null &&
    typeof maybeBundled === 'object' &&
    typeof maybeBundled.default === 'function'
  ) {
    return maybeBundled.default
  } else {
    return maybeBundled
  }
}

module.exports.executeFn = function executeFn (fn, args, callback) {
  let thenable = null
  const length = args.length + 1

  if (fn.length < length) {
    thenable = promise.try(fn, ...args)
  } else {
    const maybePromiseLike = fn.call(fn, ...args, callback)
    isPromiseLike(maybePromiseLike) && (thenable = maybePromiseLike)
  }

  if (isPromiseLike(thenable)) {
    thenable.then(
      () => process.nextTick(callback),
      (error) => process.nextTick(callback, error)
    )
  }
}
