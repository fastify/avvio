'use strict'

const test = require('tap').test
const boot = require('..')

test('array of plugins', (t) => {
  t.plan(21)

  const options = { hello: 'world' }
  const app = boot()
  const order = [1, 2, 3, 4, 5]

  app.use([first, second, third, fourth, fifth], options, (err) => {
    t.error(err)
  })

  app.on('start', () => {
    t.pass('booted')
  })

  function first (instance, opts, cb) {
    t.type(instance, app)
    t.deepEqual(opts, options)
    t.equal(order.shift(), 1)
    cb()
  }

  function second (instance, opts, cb) {
    t.type(instance, app)
    t.deepEqual(opts, options)
    t.equal(order.shift(), 2)
    process.nextTick(cb)
  }

  function third (instance, opts, cb) {
    t.type(instance, app)
    t.deepEqual(opts, options)
    t.equal(order.shift(), 3)
    cb()
  }

  function fourth (instance, opts, cb) {
    t.type(instance, app)
    t.deepEqual(opts, options)
    t.equal(order.shift(), 4)
    process.nextTick(cb)
  }

  function fifth (instance, opts, cb) {
    t.type(instance, app)
    t.deepEqual(opts, options)
    t.equal(order.shift(), 5)
    cb()
  }
})
