'use strict'

// debug is the same name as deprecated API, we use alias instead
const { debuglog } = require('util')

module.exports = {
  debug: debuglog('avvio')
}
