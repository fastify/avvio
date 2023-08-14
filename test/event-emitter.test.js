'use strict'

const { test } = require('tap')
const boot = require('..')
const { EventEmitter } = require('events')

test('avvio inherits from EventEmitter', (t) => {
  t.plan(1)

  const app = boot()
  t.ok(app instanceof EventEmitter)
})
