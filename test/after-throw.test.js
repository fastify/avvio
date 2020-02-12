'use strict'

const t = require('tap')
const boot = require('..')
const app = boot()

t.plan(2)

t.threw = function (err) {
  t.equal(err.message, 'kaboom2')
}

app.use(function (f, opts) {
  return Promise.reject(new Error('kaboom'))
}).after(function (err) {
  t.equal(err.message, 'kaboom')
  throw new Error('kaboom2')
})

app.ready(function () {
  t.fail('the ready callback should never be called')
})
