'use strict'
// Code inherited from fastify-error
const { inherits, format } = require('util')

function createError (code, message, Base = Error) {
  if (!code) throw new Error('Avvio error code must not be empty')
  if (!message) throw new Error('Avvio base error message must not be empty')

  function AvvioError (a, b, c) {
    if (!new.target) {
      return new AvvioError(a, b, c)
    }

    Error.captureStackTrace(this, AvvioError)

    this.code = code
    this.message = message
    this.name = 'AvvioError'

    // more performant than spread (...) operator
    if (a && b && c) {
      this.message = format(message, a, b, c)
    } else if (a && b) {
      this.message = format(message, a, b)
    } else if (a) {
      this.message = format(message, a)
    } else {
      this.message = message
    }
  }

  AvvioError.prototype[Symbol.toStringTag] = 'Error'
  AvvioError.prototype.toString = function () {
    return `${this.name} [${this.code}]: ${this.message}`
  }

  inherits(AvvioError, Base)

  return AvvioError
}

module.exports = {
  createError,
  AVV_ERR_EXPOSE_ALREADY_DEFINED: createError(
    'AVV_ERR_EXPOSE_ALREADY_DEFINED',
    "'%s' () is already defined, specify an expose option"
  ),
  AVV_ERR_CALLBACK_NOT_FN: createError(
    'AVV_ERR_CALLBACK_NOT_FN',
    "Callback for '%s' hook is not a function. Received: '%s'"
  ),
  AVV_ERR_PLUGIN_NOT_VALID: createError(
    'AVV_ERR_PLUGIN_NOT_VALID',
    "Plugin must be a function or a promise. Received: '%s'"
  ),
  AVV_ERR_ROOT_PLG_BOOTED: createError(
    'AVV_ERR_PLUGIN_NOT_VALID',
    'Root plugin has already booted'
  ),
  AVV_ERR_PARENT_PLG_LOADED: createError(
    'AVV_ERR_PARENT_PLG_LOADED',
    "Impossible to load '%s' plugin because the parent '%s' was already loaded"
  ),
  AVV_ERR_READY_TIMEOUT: createError(
    'AVV_ERR_READY_TIMEOUT',
    "Plugin did not start in time: '%s'. You may have forgotten to call 'done' function or to resolve a Promise"
  )
}
