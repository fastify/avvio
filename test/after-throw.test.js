'use strict'

const { test } = require('node:test')
const boot = require('..')

test('catched error by Promise.reject', (t, end) => {
  const app = boot()
  t.plan(2)

  const uncaughtExceptionHandlers = process.listeners('uncaughtException')

  process
    .removeAllListeners('uncaughtException')
    .once('uncaughtException', (err) => {
      t.assert.strictEqual(err.message, 'kaboom2')

      uncaughtExceptionHandlers.forEach((handler) =>
        process.on('uncaughtException', handler)
      )
      end()
    })

  app
    .use(function (f, opts) {
      return Promise.reject(new Error('kaboom'))
    })
    .after(function (err) {
      t.assert.strictEqual(err.message, 'kaboom')
      throw new Error('kaboom2')
    })

  app.ready(function () {
    t.assert.fail('the ready callback should never be called')
  })
})
