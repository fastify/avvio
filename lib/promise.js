'use strict'

function withResolvers () {
  // use native if avaiable
  if (Promise.withResolvers) return Promise.withResolvers()

  const resolvers = {
    resolve: null,
    reject: null,
    promise: null
  }

  resolvers.promise = new Promise((resolve, reject) => {
    resolvers.resolve = resolve
    resolvers.reject = reject
  })

  return resolvers
}
module.exports.withResolvers = withResolvers

function _try (fn, ...args) {
  // use native if avaiable
  if (Promise.try) return Promise.try(fn, ...args)

  const resolvers = withResolvers()

  try {
    const result = fn.call(fn, ...args)
    resolvers.resolve(result)
  } catch (error) {
    resolvers.reject(error)
  }

  return resolvers.promise
}

module.exports.try = _try

function isPromiseLike (maybePromiseLike) {
  return (
    maybePromiseLike !== null &&
    typeof maybePromiseLike === 'object' &&
    typeof maybePromiseLike.then === 'function'
  )
}

module.exports.isPromiseLike = isPromiseLike
