'use strict'

const tap = require('tap')

if (Number(process.versions.node[0]) >= 8) {
  require('./async-await')
} else {
  tap.pass('Skip because Node version < 8')
  tap.end()
}
