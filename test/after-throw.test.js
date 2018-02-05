'use strict'

const t = require('tap')
const boot = require('..')
const app = boot()

t.plan(2)

var listenersError
var listenersRejections

function noUnhandledRejection (e) {
  t.fail('unhandledRejection should never be called')
}

function handleUncaughtException (e) {
  t.pass('uncaughtException seen')
}

process.nextTick(() => {
  listenersError = process.listeners('uncaughtException')
  listenersRejections = process.listeners('uncaughtException')
  process.removeAllListeners('uncaughtException')
  process.removeAllListeners('unhandledRejection')
  process.once('unhandledRejection', noUnhandledRejection)
  process.once('uncaughtException', handleUncaughtException)
})

t.tearDown(function () {
  process.removeListener('unhandledRejection', noUnhandledRejection)
  process.removeListener('uncaughtException', handleUncaughtException)
  listenersError.forEach((l) => process.on('uncaughtException', l))
  listenersRejections.forEach((l) => process.on('unhandledRejection', l))
})

app.use(function (f, opts) {
  return Promise.reject(new Error('kaboom'))
}).after(function (err) {
  t.equal(err.message, 'kaboom')
  throw new Error('kaboom2')
})

app.ready(function () {
  t.fail('the ready callback should never be called')
})
