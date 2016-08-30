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

;['use', 'after', 'ready'].forEach((key) => {
  test('throws if ' + key + ' is already there', (t) => {
    t.plan(1)

    const app = {}
    app[key] = () => {}

    try {
      boot(app)
      t.fail('error must happen')
    } catch (err) {
      t.equal(err.message, key + '() is already defined, specify an expose option')
    }
  })

  test('support expose for ' + key, (t) => {
    const app = {}
    app[key] = () => {}

    const expose = {}
    expose[key] = 'muahah'

    boot(app, {
      expose: expose
    })

    t.end()
  })
})
