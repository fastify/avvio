'use strict'

const { test } = require('node:test')
const boot = require('..')

test('catch exceptions in parent.override', (t, testCompleted) => {
  t.plan(1)

  const server = {}

  const app = boot(server, {
    autostart: false
  })
  app.override = function () {
    throw new Error('catch it')
  }

  app
    .use(function () {})
    .start()

  app.ready(function (err) {
    t.assert.strictEqual(err.message, 'catch it')
    testCompleted()
  })
})
