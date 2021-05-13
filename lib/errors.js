'use strict'
// Code inherited from fastify-error
const { inherits, format } = require('util')

function createError (code, message, Base = Error) {
  if (!code) throw new Error('Avvio error code must not be empty')
  if (!message) throw new Error('Avvio base error message must not be empty')

  function AvvioError (a, b, c) {
    if (!(this instanceof AvvioError)) {
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

module.exports = createError
