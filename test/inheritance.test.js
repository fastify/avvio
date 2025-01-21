const test = require('node:test').test
const EventEmitter = require('node:events').EventEmitter
const Avvio = require('../avvio')

test('avvio instanceof Avvio', function (t) {
  t.plan(1)
  const avvio = new Avvio()
  t.assert.ok(avvio instanceof Avvio)
})

test('avvio instanceof EventEmitter', function (t) {
  t.plan(1)
  const avvio = new Avvio()
  t.assert.ok(avvio instanceof EventEmitter)
})
