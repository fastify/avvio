'use strict'

const test = require('tap').test
const boot = require('..')

test('boot an empty app', (t) => {
  t.plan(1)
  const app = boot()
  app.on('start', () => {
    t.pass('booted')
  })
})

test('boot an app with a plugin', (t) => {
  t.plan(4)

  const app = boot()
  var after = false

  app.use(function (server, opts, done) {
    t.equal(server, app, 'the first argument is the server')
    t.deepEqual(opts, {}, 'no options')
    t.ok(after, 'delayed execution')
    done()
  })

  after = true

  app.on('start', () => {
    t.pass('booted')
  })
})

test('boot an app with a plugin and a callback', (t) => {
  t.plan(2)

  const app = boot(() => {
    t.pass('booted')
  })

  app.use(function (server, opts, done) {
    t.pass('plugin loaded')
    done()
  })
})

test('boot a plugin with a custom server', (t) => {
  t.plan(4)

  const server = {}
  const app = boot(server)

  app.use(function (s, opts, done) {
    t.equal(s, server, 'the first argument is the server')
    t.deepEqual(opts, {}, 'no options')
    done()
  })

  app.onClose(() => {
    t.ok('onClose called')
  })

  app.on('start', () => {
    app.close(() => {
      t.pass('booted')
    })
  })
})

test('custom instance should inherits avvio methods', (t) => {
  t.plan(6)

  const server = {}
  const app = boot(server, {})

  server.use(function (s, opts, done) {
    t.equal(s, server, 'the first argument is the server')
    t.deepEqual(opts, {}, 'no options')
    done()
  }).after(() => {
    t.ok('after called')
  })

  server.onClose(() => {
    t.ok('onClose called')
  })

  server.ready(() => {
    t.ok('ready called')
  })

  app.on('start', () => {
    server.close(() => {
      t.pass('booted')
    })
  })
})

test('boot a plugin with options', (t) => {
  t.plan(3)

  const server = {}
  const app = boot(server)
  const myOpts = {
    hello: 'world'
  }

  app.use(function (s, opts, done) {
    t.equal(s, server, 'the first argument is the server')
    t.deepEqual(opts, myOpts, 'passed options')
    done()
  }, myOpts)

  app.on('start', () => {
    t.pass('booted')
  })
})

test('throw on non-function use', (t) => {
  t.plan(1)
  const app = boot()
  t.throws(() => {
    app.use({})
  })
})

// https://github.com/mcollina/avvio/issues/20
test('ready and nextTick', (t) => {
  const app = boot()
  process.nextTick(() => {
    app.ready(() => {
      t.end()
    })
  })
})

// https://github.com/mcollina/avvio/issues/20
test('promises and microtask', (t) => {
  const app = boot()
  Promise.resolve()
    .then(() => {
      app.ready(function () {
        t.end()
      })
    })
})

test('always loads nested plugins after the current one', (t) => {
  t.plan(2)

  const server = {}
  const app = boot(server)

  var second = false

  app.use(function (s, opts, done) {
    app.use(function (s, opts, done) {
      second = true
      done()
    })
    t.notOk(second)

    done()
  })

  app.on('start', () => {
    t.ok(second)
  })
})
