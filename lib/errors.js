'use strict'

const { createError } = require('@fastify/error')

module.exports.AVV_ERR_EXPOSE_ALREADY_DEFINED = createError(
  'AVV_ERR_EXPOSE_ALREADY_DEFINED',
  "'%s' is already defined, specify an expose option for '%s'"
)
module.exports.AVV_ERR_CALLBACK_NOT_FN = createError(
  'AVV_ERR_CALLBACK_NOT_FN',
  "Callback for '%s' hook is not a function. Received: '%s'"
)
