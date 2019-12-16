'use strict'

const tap = require('tap')
const semver = require('semver')

if (semver.lt(process.versions.node, '13.3.0')) {
  tap.pass('Skip because Node version <= 13.3.0')
  tap.end()
} else {
  // Import is not allowed syntax in Node 8
  // eslint-disable-next-line
  new Function('module', 'return import(module)')('./esm.mjs').catch((err) => {
    process.nextTick(() => {
      throw err
    })
  })
}
