'use strict'

const { test } = require('node:test')
const boot = require('..')

test('catched error by Promise.reject', async (t) => {
  const app = boot()
  t.plan(3)

  try {
    await app
      .use(function (f, opts) {
        return Promise.reject(new Error('kaboom'))
      })
      .after(async function (err) {
        t.assert.strictEqual(err.message, 'kaboom')
        throw new Error('kaboom2')
      })
  } catch (err) {
    t.assert.strictEqual(err.message, 'kaboom2')
  }

  app.ready(function () {
    t.assert.fail('the ready callback should never be called')
  })
})

test('after callback receives plugin error', async (t) => {
  const app = boot()
  const error = new Error('plugin failed')

  app.use(function (instance, opts, done) {
    done(error)
  })

  await new Promise((resolve, reject) => {
    app.after(function (err, done) {
      t.assert.strictEqual(err, error)
      done()
      resolve()
    })

    app.ready(function (err) {
      if (err && err !== error) {
        reject(err)
      }
    })
  })
})

test('after promise rejects on plugin error', async (t) => {
  const app = boot()
  const error = new Error('plugin failed')

  app.use(function (instance, opts, done) {
    done(error)
  })

  await t.assert.rejects(app.after(), error)
})
