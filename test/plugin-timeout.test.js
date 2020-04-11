'use strict'

const t = require('tap')
const test = t.test
const boot = require('..')

test('timeout without calling next - callbacks', (t) => {
  t.plan(4)
  const app = boot({}, {
    timeout: 10 // 10 ms
  })
  app.use(one)
  function one (app, opts, next) {
    // do not call next on purpose
  }
  app.ready((err) => {
    t.ok(err)
    t.strictEqual(err.fn, one)
    t.strictEqual(err.message, 'ERR_AVVIO_PLUGIN_TIMEOUT: plugin did not start in time: one')
    t.strictEqual(err.code, 'ERR_AVVIO_PLUGIN_TIMEOUT')
  })
})

test('timeout without calling next - promises', (t) => {
  t.plan(4)
  const app = boot({}, {
    timeout: 10 // 10 ms
  })
  app.use(two)
  function two (app, opts) {
    return new Promise(function (resolve) {
      // do not call resolve on purpose
    })
  }
  app.ready((err) => {
    t.ok(err)
    t.strictEqual(err.fn, two)
    t.strictEqual(err.message, 'ERR_AVVIO_PLUGIN_TIMEOUT: plugin did not start in time: two')
    t.strictEqual(err.code, 'ERR_AVVIO_PLUGIN_TIMEOUT')
  })
})

test('timeout without calling next - use file as name', (t) => {
  t.plan(3)
  const app = boot({}, {
    timeout: 10 // 10 ms
  })
  app.use(require('./fixtures/plugin-no-next'))
  app.ready((err) => {
    t.ok(err)
    t.strictEqual(err.message, 'ERR_AVVIO_PLUGIN_TIMEOUT: plugin did not start in time: ' + require.resolve('./fixtures/plugin-no-next'))
    t.strictEqual(err.code, 'ERR_AVVIO_PLUGIN_TIMEOUT')
  })
})

test('timeout without calling next - use code as name', (t) => {
  t.plan(3)
  const app = boot({}, {
    timeout: 10 // 10 ms
  })
  app.use(function (app, opts, next) {
    // do not call next on purpose - code as name
  })

  app.ready((err) => {
    t.ok(err)
    t.strictEqual(err.message, 'ERR_AVVIO_PLUGIN_TIMEOUT: plugin did not start in time: function (app, opts, next) { -- // do not call next on purpose - code as name')
    t.strictEqual(err.code, 'ERR_AVVIO_PLUGIN_TIMEOUT')
  })
})

test('does not keep going', (t) => {
  t.plan(2)
  const app = boot({}, {
    timeout: 10 // 10 ms
  })
  app.use(function three (app, opts, next) {
    next(new Error('kaboom'))
  })
  app.ready((err) => {
    t.ok(err)
    t.strictEqual(err.message, 'kaboom')
  })
})

test('throw in override without autostart', (t) => {
  t.plan(2)

  const server = { my: 'server' }
  const app = boot(server, {
    timeout: 10,
    autostart: false
  })

  app.override = function (s) {
    throw new Error('kaboom')
  }

  app.use(function (s, opts, cb) {
    t.fail('this is never reached')
  })

  setTimeout(function () {
    app.ready((err) => {
      t.ok(err)
      t.strictEqual(err.message, 'kaboom')
    })
  }, 20)
})

test('timeout without calling next in ready and ignoring the error', (t) => {
  t.plan(11)
  const app = boot({}, {
    timeout: 10, // 10 ms
    autostart: false
  })

  let preReady = false

  app.use(function one (app, opts, next) {
    t.pass('loaded')
    app.ready(function readyOk (err, done) {
      t.notOk(err)
      t.pass('first ready called')
      done()
    })
    next()
  })

  app.on('preReady', () => {
    t.pass('preReady should be called')
    preReady = true
  })

  app.on('start', () => {
    t.pass('start should be called')
  })

  app.ready(function onReadyWithoutDone (err, done) {
    t.pass('wrong ready called')
    t.ok(preReady, 'preReady already called')
    t.notOk(err)
    // done() // Don't call done
  })

  app.ready(function onReadyTwo (err) {
    t.ok(err)
    t.strictEqual(err.message, 'ERR_AVVIO_READY_TIMEOUT: plugin did not start in time: onReadyWithoutDone')
    t.strictEqual(err.code, 'ERR_AVVIO_READY_TIMEOUT')
    // don't rethrow the error
  })

  app.start()
})

test('timeout without calling next in ready and rethrowing the error', (t) => {
  t.plan(11)
  const app = boot({}, {
    timeout: 10, // 10 ms
    autostart: true
  })

  app.use(function one (app, opts, next) {
    t.pass('loaded')
    app.ready(function readyOk (err, done) {
      t.ok(err)
      t.strictEqual(err.message, 'ERR_AVVIO_READY_TIMEOUT: plugin did not start in time: onReadyWithoutDone')
      t.strictEqual(err.code, 'ERR_AVVIO_READY_TIMEOUT')
      done(err)
    })
    next()
  })

  app.on('preReady', () => {
    t.pass('preReady should be called')
  })

  app.on('start', () => {
    t.pass('start should be called in any case')
  })

  app.ready(function onReadyWithoutDone (err, done) {
    t.pass('wrong ready called')
    t.notOk(err)
    // done() // Don't call done
  })

  app.ready(function onReadyTwo (err, done) {
    t.ok(err)
    t.strictEqual(err.message, 'ERR_AVVIO_READY_TIMEOUT: plugin did not start in time: onReadyWithoutDone')
    t.strictEqual(err.code, 'ERR_AVVIO_READY_TIMEOUT')
    done(err)
  })

  app.start()
})
