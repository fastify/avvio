'use strict'

const test = require('tap').test
const boot = require('..')

test('boot a plugin and then execute a call after that', (t) => {
  t.plan(4)

  const app = boot()
  let pluginLoaded = false
  let deferCalled = false

  app.use(function (s, opts, done) {
    t.notOk(deferCalled, 'defer not called')
    pluginLoaded = true
    done()
  })

  app.after(function (cb) {
    t.ok(pluginLoaded, 'deferred!')
    deferCalled = true
    cb()
  })

  app.on('start', () => {
    t.ok(deferCalled, 'defer called')
    t.ok(pluginLoaded, 'plugin loaded')
  })
})

test('after without a done callback', (t) => {
  t.plan(4)

  const app = boot()
  let pluginLoaded = false
  let deferCalled = false

  app.use(function (s, opts, done) {
    t.notOk(deferCalled, 'defer not called')
    pluginLoaded = true
    done()
  })

  app.after(function () {
    t.ok(pluginLoaded, 'deferred!')
    deferCalled = true
  })

  app.on('start', () => {
    t.ok(deferCalled, 'defer called')
    t.ok(pluginLoaded, 'plugin loaded')
  })
})

test('verify when a deferred call happens', (t) => {
  t.plan(2)

  const app = boot()

  app.use(function (s, opts, done) {
    done()
  })

  app.after(function (cb) {
    cb()
  }, function () {
    t.pass('deferred finished')
  })

  app.on('start', () => {
    t.pass('booted')
  })
})

test('internal after', (t) => {
  t.plan(17)

  const app = boot()
  let firstLoaded = false
  let secondLoaded = false
  let thirdLoaded = false
  let afterCalled = false

  app.use(first)
  app.use(third)

  function first (s, opts, done) {
    t.notOk(firstLoaded, 'first is not loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    firstLoaded = true
    s.use(second)
    s.after(function (cb) {
      t.notOk(afterCalled, 'after was not called')
      afterCalled = true
      cb()
    })
    done()
  }

  function second (s, opts, done) {
    t.ok(firstLoaded, 'first is loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    t.notOk(afterCalled, 'after was not called')
    secondLoaded = true
    done()
  }

  function third (s, opts, done) {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.ok(afterCalled, 'after was called')
    t.notOk(thirdLoaded, 'third is not loaded')
    thirdLoaded = true
    done()
  }

  app.on('start', () => {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.ok(thirdLoaded, 'third is loaded')
    t.ok(afterCalled, 'after was called')
    t.pass('booted')
  })
})
