'use strict'

const { test } = require('node:test')
const boot = require('..')
const { setTimeout } = require('timers/promises')

test('catched error by Promise.reject', async (t) => {
  const app = boot()
  t.plan(2)

  const uncaughtExceptionHandlers = process.listeners('uncaughtException')

  process
    .removeAllListeners('uncaughtException')
    .once('uncaughtException', (err) => {
      t.assert.strictEqual(err.message, 'kaboom2')

      // Restore original handlers
      uncaughtExceptionHandlers.forEach((handler) =>
        process.on('uncaughtException', handler)
      )
    })

  app
    .use(function (f, opts) {
      return Promise.reject(new Error('kaboom'))
    })
    .after(function (err) {
      t.assert.strictEqual(err.message, 'kaboom')
      throw new Error('kaboom2')
    })

  // Wait for the uncaught exception to be thrown
  app.ready(function () {
    t.assert.fail('the ready callback should never be called')
  })

  await setTimeout(100)
})
