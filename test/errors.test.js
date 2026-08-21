'use strict'

const { test } = require('node:test')
const boot = require('..')
const errors = require('../lib/errors')

test('Correct codes of AvvioErrors', t => {
  const testcases = [
    'AVV_ERR_EXPOSE_ALREADY_DEFINED',
    'AVV_ERR_ATTRIBUTE_ALREADY_DEFINED',
    'AVV_ERR_CALLBACK_NOT_FN',
    'AVV_ERR_PLUGIN_NOT_VALID',
    'AVV_ERR_ROOT_PLG_BOOTED',
    'AVV_ERR_PARENT_PLG_LOADED',
    'AVV_ERR_READY_TIMEOUT',
    'AVV_ERR_PLUGIN_EXEC_TIMEOUT'
  ]

  t.plan(testcases.length + 1)
  // errors.js exposes errors and the createError fn
  t.assert.strictEqual(testcases.length, Object.keys(errors).length)

  for (const testcase of testcases) {
    const error = new errors[testcase]()
    t.assert.strictEqual(error.code, testcase)
  }
})

test('adding plugin to an already booted root throws', async (t) => {
  const app = boot()

  await app.ready()

  t.assert.throws(
    () => {
      app._addPlugin(function plugin () {}, {}, false)
    },
    {
      code: 'AVV_ERR_ROOT_PLG_BOOTED'
    }
  )
})

test('adding plugin to loaded current plugin throws', (t) => {
  const app = boot()
  const current = app._current[0]

  current.loaded = true
  app.booted = false

  t.assert.throws(
    () => {
      app._addPlugin(function plugin () {}, {}, false)
    },
    {
      message: 'plugin'
    }
  )
})
