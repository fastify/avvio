'use strict'

/* eslint no-prototype-builtins: off */

const { test } = require('node:test')
const boot = require('..')

test('do not load', async (t) => {
  // Leave enough time for the nested plugins to start when the test suite is
  // running concurrently. Their timeout is shortened relative to the parent,
  // so the deliberately unresolved `third` plugin still expires first.
  const app = boot({}, { timeout: 100 })

  app.use(first)

  async function first (s, opts) {
    await s.use(second)
  }

  async function second (s, opts) {
    await s.use(third)
  }

  function third (s, opts) {
    return new Promise((resolve, reject) => {
      // no resolve
    })
  }

  try {
    await app.start()
    t.assert.fail('should throw')
  } catch (err) {
    t.assert.strictEqual(err.message, 'Plugin did not start in time: \'third\'. You may have forgotten to call \'done\' function or to resolve a Promise')
  }
})
