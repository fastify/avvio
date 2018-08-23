'use strict'

const t = require('tap')
const test = t.test
const boot = require('..')

test('timeout without calling next - callbacks', (t) => {
  t.plan(2)
  const app = boot({}, {
    timeout: 10 // 10 ms
  })
  app.use(function one (app, opts, next) {
    // do not call next on purpose
  })
  app.ready((err) => {
    t.ok(err)
    t.strictEqual(err.message, 'plugin did not start in time: one')
  })
})

test('timeout without calling next - promises', (t) => {
  t.plan(2)
  const app = boot({}, {
    timeout: 10 // 10 ms
  })
  app.use(function one (app, opts) {
    return new Promise(function (resolve) {
      // do not call resolve on purpose
    })
  })
  app.ready((err) => {
    t.ok(err)
    t.strictEqual(err.message, 'plugin did not start in time: one')
  })
})
