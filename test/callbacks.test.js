'use strict'

const test = require('tap').test
const boot = require('..')

test('use a plugin and wait till that is loaded', (t) => {
  t.plan(3)

  const app = boot()

  app.use(function (server, opts, done) {
    t.equal(server, app, 'the first argument is the server')
    t.deepEqual(opts, {}, 'no options')
    done()
  }, () => {
    t.pass('booted')
  })
})

test('reentrant', (t) => {
  t.plan(7)

  const app = boot()
  let firstLoaded = false
  let secondLoaded = false

  app.use(first, () => {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.pass('booted')
  })

  function first (s, opts, done) {
    t.notOk(firstLoaded, 'first is not loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    firstLoaded = true
    s.use(second)
    done()
  }

  function second (s, opts, done) {
    t.ok(firstLoaded, 'first is loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    secondLoaded = true
    done()
  }
})

test('reentrant with callbacks deferred', (t) => {
  t.plan(11)

  const app = boot()
  let firstLoaded = false
  let secondLoaded = false
  let thirdLoaded = false

  app.use(first)

  function first (s, opts, done) {
    t.notOk(firstLoaded, 'first is not loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    firstLoaded = true
    s.use(second, function () {
      t.throws(() => {
        s.use(third)
      }, 'Impossible to load "third" because the parent "first" was already loaded')
    })
    done()
  }

  function second (s, opts, done) {
    t.ok(firstLoaded, 'first is loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    secondLoaded = true
    done()
  }

  function third (s, opts, done) {
    thirdLoaded = true
    done()
  }

  app.on('start', () => {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    t.pass('booted')
  })
})
