'use strict'

const t = require('tap')
const boot = require('..')
const app = {}

boot(app)

t.plan(5)

app.use(function (f, opts) {
  return Promise.reject(new Error('kaboom'))
}).after(function (err, cb) {
  t.pass('this is just called')
  cb(err)
}).after(function () {
  t.pass('this is just called')
}).after(function (err, cb) {
  t.pass('this is just called')
  cb(err)
})

app.ready().then(() => {
  t.fail('this should not be called')
}).catch(err => {
  t.ok(err)
  t.strictEqual(err.message, 'kaboom')
})
