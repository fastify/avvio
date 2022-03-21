'use strict'

const { test } = require('tap')
const semver = require('semver')

test('support import', { skip: semver.lt(process.versions.node, '13.3.0') }, (t) => {
    t.pass('Skip because Node version <= 13.3.0')
    t.end()
  } else {
    import('./esm.mjs').then(() => {
      t.pass('esm is supported')
      t.end()
    }).catch((err) => {
      process.nextTick(() => {
        throw err
      })
    })
  }
})
