'use strict'

const test = require('tap').test
const boot = require('..')

test('chainable standalone', (t) => {
  t.plan(4)

  boot()
    .use(function (ctx, opts, done) {
      t.pass('1st plugin')
      done()
    }).after(function (done) {
      t.pass('2nd after')
      done()
    }).ready(function () {
      t.pass('we are ready')
    }).use(function (ctx, opts, done) {
      t.pass('3rd plugin')
      done()
    })
})

test('chainable automatically binded', (t) => {
  t.plan(4)

  const app = {}
  boot(app)

  app
    .use(function (ctx, opts, done) {
      t.pass('1st plugin')
      done()
    }).after(function (done) {
      t.pass('2nd after')
      done()
    }).ready(function () {
      t.pass('we are ready')
    }).use(function (ctx, opts, done) {
      t.pass('3rd plugin')
      done()
    })
})
