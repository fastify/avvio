'use strict'

const tap = require('tap')

if (Number(process.versions.node.split('.')[0]) >= 8) {
  require('./async-await')
  require('./await-after')
  require('./await-use')
} else {
  tap.pass('Skip because Node version < 8')
  tap.end()
}
