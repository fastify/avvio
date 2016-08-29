'use strict'

const test = require('tap').test
const boot = require('..')

test('boot a plugin and then execute a call after that', (t) => {
  t.plan(4)

  const app = boot()
  let pluginLoaded = false
  let afterCalled = false

  app.use(function (s, opts, done) {
    t.notOk(afterCalled, 'after not called')
    pluginLoaded = true
    done()
  })

  app.after(function (cb) {
    t.ok(pluginLoaded, 'afterred!')
    afterCalled = true
    cb()
  })

  app.on('start', () => {
    t.ok(afterCalled, 'after called')
    t.ok(pluginLoaded, 'plugin loaded')
  })
})

test('after without a done callback', (t) => {
  t.plan(4)

  const app = boot()
  let pluginLoaded = false
  let afterCalled = false

  app.use(function (s, opts, done) {
    t.notOk(afterCalled, 'after not called')
    pluginLoaded = true
    done()
  })

  app.after(function () {
    t.ok(pluginLoaded, 'afterred!')
    afterCalled = true
  })

  app.on('start', () => {
    t.ok(afterCalled, 'after called')
    t.ok(pluginLoaded, 'plugin loaded')
  })
})

test('verify when a afterred call happens', (t) => {
  t.plan(2)

  const app = boot()

  app.use(function (s, opts, done) {
    done()
  })

  app.after(function (cb) {
    cb()
  }, function () {
    t.pass('afterred finished')
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

test('ready adds at the end of the queue', (t) => {
  t.plan(11)

  const app = boot()
  let pluginLoaded = false
  let afterCalled = false
  let readyCalled = false

  app.ready(function (cb) {
    t.ok(pluginLoaded, 'after the plugin')
    t.ok(afterCalled, 'after after')
    readyCalled = true
    process.nextTick(cb)
  })

  app.use(function (s, opts, done) {
    t.notOk(afterCalled, 'after not called')
    t.notOk(readyCalled, 'ready not called')
    pluginLoaded = true

    app.ready(function (cb) {
      t.ok(readyCalled, 'after the first ready')
      t.ok(afterCalled, 'after the after callback')
      process.nextTick(cb)
    })

    done()
  })

  app.after(function (cb) {
    t.ok(pluginLoaded, 'executing after!')
    t.notOk(readyCalled, 'ready not called')
    afterCalled = true
    cb()
  })

  app.on('start', () => {
    t.ok(afterCalled, 'after called')
    t.ok(pluginLoaded, 'plugin loaded')
    t.ok(readyCalled, 'ready called')
  })
})
