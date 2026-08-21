'use strict'

const { test } = require('node:test')
const boot = require('..')
const { AVV_ERR_CALLBACK_NOT_FN } = require('../lib/errors')

test('boot an app with a plugin', (t, done) => {
  t.plan(4)

  const app = boot()
  let last = false

  app.use(function (server, opts, done) {
    app.onClose(() => {
      t.assert.ok('onClose called')
      t.assert.ok(!last)
      last = true
    })
    done()
  })

  app.on('start', () => {
    app.close(() => {
      t.assert.ok(last)
      t.assert.ok('Closed in the correct order')
      done()
    })
  })
})

test('onClose arguments', (t, done) => {
  t.plan(5)

  const app = boot()

  app.use(function (server, opts, next) {
    server.onClose((instance, done) => {
      t.assert.ok('called')
      t.assert.strictEqual(server, instance)
      done()
    })
    next()
  })

  app.use(function (server, opts, next) {
    server.onClose((instance) => {
      t.assert.ok('called')
      t.assert.strictEqual(server, instance)
    })
    next()
  })

  app.on('start', () => {
    app.close(() => {
      t.assert.ok('Closed in the correct order')
      done()
    })
  })
})

test('onClose arguments - fastify encapsulation test case', (t, done) => {
  t.plan(5)

  const server = { my: 'server' }
  const app = boot(server)

  app.override = function (s, fn, opts) {
    s = Object.create(s)
    return s
  }

  app.use(function (instance, opts, next) {
    instance.test = true
    instance.onClose((i, done) => {
      t.assert.ok(i.test)
      done()
    })
    next()
  })

  app.use(function (instance, opts, next) {
    t.assert.ok(!instance.test)
    instance.onClose((i, done) => {
      t.assert.ok(!i.test)
      done()
    })
    next()
  })

  app.on('start', () => {
    t.assert.ok(!app.test)
    app.close(() => {
      t.assert.ok('Closed in the correct order')
      done()
    })
  })
})

test('onClose arguments - fastify encapsulation test case / 2', (t, testDone) => {
  t.plan(5)

  const server = { my: 'server' }
  const app = boot(server)

  app.override = function (s, fn, opts) {
    s = Object.create(s)
    return s
  }

  server.use(function (instance, opts, next) {
    instance.test = true
    instance.onClose((i, done) => {
      t.assert.ok(i.test)
      done()
      testDone()
    })
    next()
  })

  server.use(function (instance, opts, next) {
    t.assert.ok(!instance.test)
    instance.onClose((i, done) => {
      t.assert.ok(!i.test)
      done()
    })
    next()
  })

  app.on('start', () => {
    t.assert.ok(!server.test)
    try {
      server.close()
      t.assert.ok(true)
    } catch (err) {
      t.assert.fail(err)
    }
  })
})

test('onClose arguments - encapsulation test case no server', (t, done) => {
  t.plan(5)

  const app = boot()

  app.override = function (s, fn, opts) {
    s = Object.create(s)
    return s
  }

  app.use(function (instance, opts, next) {
    instance.test = true
    instance.onClose((i, done) => {
      t.assert.ok(!i.test)
      done()
    })
    next()
  })

  app.use(function (instance, opts, next) {
    t.assert.ok(!instance.test)
    instance.onClose((i) => {
      t.assert.ok(!i.test)
    })
    next()
  })

  app.on('start', () => {
    t.assert.ok(!app.test)
    app.close(() => {
      t.assert.ok('Closed in the correct order')
      done()
    })
  })
})

test('onClose should handle errors', (t, done) => {
  t.plan(3)

  const app = boot()

  app.use(function (server, opts, done) {
    app.onClose((instance, done) => {
      t.assert.ok('called')
      done(new Error('some error'))
    })
    done()
  })

  app.on('start', () => {
    app.close(err => {
      t.assert.strictEqual(err.message, 'some error')
      t.assert.ok('Closed in the correct order')
      done()
    })
  })
})

test('#54 close handlers should receive same parameters when queue is not empty', (t, done) => {
  t.plan(6)

  const context = { test: true }
  const app = boot(context)

  app.use(function (server, opts, done) {
    done()
  })
  app.on('start', () => {
    app.close((err, done) => {
      t.assert.strictEqual(err, null)
      t.assert.ok('Closed in the correct order')
      setImmediate(done)
    })
    app.close(err => {
      t.assert.strictEqual(err, null)
      t.assert.ok('Closed in the correct order')
    })
    app.close(err => {
      t.assert.strictEqual(err, null)
      t.assert.ok('Closed in the correct order')
      done()
    })
  })
})

test('onClose should handle errors / 2', (t, done) => {
  t.plan(4)

  const app = boot()

  app.onClose((instance, done) => {
    t.assert.ok('called')
    done(new Error('some error'))
  })

  app.use(function (server, opts, done) {
    app.onClose((instance, done) => {
      t.assert.ok('called')
      done()
    })
    done()
  })

  app.on('start', () => {
    app.close(err => {
      t.assert.strictEqual(err.message, 'some error')
      t.assert.ok('Closed in the correct order')
      done()
    })
  })
})

test('close arguments', (t, testDone) => {
  t.plan(4)

  const app = boot()

  app.use(function (server, opts, done) {
    app.onClose((instance, done) => {
      t.assert.ok('called')
      done()
    })
    done()
  })

  app.on('start', () => {
    app.close((err, instance, done) => {
      t.assert.ifError(err)
      t.assert.strictEqual(instance, app)
      done()
      t.assert.ok('Closed in the correct order')
      testDone()
    })
  })
})

test('close event', (t, done) => {
  t.plan(3)

  const app = boot()
  let last = false

  app.on('start', () => {
    app.close(() => {
      t.assert.ok(!last)
      last = true
    })
  })

  app.on('close', () => {
    t.assert.ok(last)
    t.assert.ok('event fired')
    done()
  })
})

test('close order', (t, testDone) => {
  t.plan(5)

  const app = boot()
  const order = [1, 2, 3, 4]

  app.use(function (server, opts, done) {
    app.onClose(() => {
      t.assert.strictEqual(order.shift(), 3)
    })

    app.use(function (server, opts, done) {
      app.onClose(() => {
        t.assert.strictEqual(order.shift(), 2)
      })
      done()
    })
    done()
  })

  app.use(function (server, opts, done) {
    app.onClose(() => {
      t.assert.strictEqual(order.shift(), 1)
    })
    done()
  })

  app.on('start', () => {
    app.close(() => {
      t.assert.strictEqual(order.shift(), 4)
      t.assert.ok('Closed in the correct order')
      testDone()
    })
  })
})

test('close without a cb', (t, testDone) => {
  t.plan(1)

  const app = boot()

  app.onClose((instance, done) => {
    t.assert.ok('called')
    done()
    testDone()
  })

  app.close()
})

test('onClose with 0 parameters', (t, testDone) => {
  t.plan(4)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (instance, opts, next) {
    instance.onClose(function () {
      t.assert.ok('called')
      t.assert.strictEqual(arguments.length, 0)
    })
    next()
  })

  app.close(err => {
    t.assert.ifError(err)
    t.assert.ok('Closed')
    testDone()
  })
})

test('onClose with 1 parameter', (t, testDone) => {
  t.plan(3)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (instance, opts, next) {
    instance.onClose(function (context) {
      t.assert.strictEqual(arguments.length, 1)
    })
    next()
  })

  app.close(err => {
    t.assert.ifError(err)
    t.assert.ok('Closed')
    testDone()
  })
})

test('close passing not a function', (t) => {
  t.plan(1)

  const app = boot()

  app.onClose((instance, done) => {
    t.assert.ok('called')
    done()
  })

  return t.assert.throws(() => app.close({}), /not a function/)
})

test('close passing not a function', (t) => {
  t.plan(1)

  const app = boot()

  app.onClose((instance, done) => {
    t.assert.ok('called')
    done()
  })

  return t.assert.throws(() => app.close({}), /not a function/)
})

test('close passing not a function when wrapping', (t) => {
  t.plan(1)

  const app = {}
  boot(app)

  app.onClose((instance, done) => {
    t.assert.ok('called')
    done()
  })

  return t.assert.throws(() => app.close({}), /not a function/)
})

test('close should trigger ready()', (t, done) => {
  t.plan(2)

  const app = boot(null, {
    autostart: false
  })

  app.on('start', () => {
    // this will be emitted after the
    // callback in close() is fired
    t.assert.ok('started')
  })

  app.close(() => {
    t.assert.ok('closed')
    done()
  })
})

test('close without a cb returns a promise', (t) => {
  t.plan(1)

  const app = boot()
  return app.close().then(() => {
    t.assert.ok('promise resolves')
  })
})

test('close without a cb returns a promise when attaching to a server', (t) => {
  t.plan(1)

  const server = {}
  boot(server)
  return server.close().then(() => {
    t.assert.ok('promise resolves')
  })
})

test('close with async onClose handlers', (t, done) => {
  t.plan(7)

  const app = boot()
  const order = [1, 2, 3, 4, 5, 6]

  app.onClose(() => {
    return new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      t.assert.strictEqual(order.shift(), 5)
    })
  })

  app.onClose(() => {
    t.assert.strictEqual(order.shift(), 4)
  })

  app.onClose(instance => {
    return new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      t.assert.strictEqual(order.shift(), 3)
    })
  })

  app.onClose(async instance => {
    return new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      t.assert.strictEqual(order.shift(), 2)
    })
  })

  app.onClose(async () => {
    return new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      t.assert.strictEqual(order.shift(), 1)
    })
  })

  app.on('start', () => {
    app.close(() => {
      t.assert.strictEqual(order.shift(), 6)
      t.assert.ok('Closed in the correct order')
      done()
    })
  })
})

test('onClose callback must be a function', (t, testDone) => {
  t.plan(1)

  const app = boot()

  app.use(async function (server, opts, done) {
    await t.assert.throws(() => app.onClose({}), new AVV_ERR_CALLBACK_NOT_FN('onClose', 'object'))
    done()
    testDone()
  })
})

test('close custom server with async onClose handlers', (t, done) => {
  t.plan(7)

  const server = {}
  const app = boot(server)
  const order = [1, 2, 3, 4, 5, 6]

  server.onClose(() => {
    return new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      t.assert.strictEqual(order.shift(), 5)
    })
  })

  server.onClose(() => {
    t.assert.strictEqual(order.shift(), 4)
  })

  server.onClose(instance => {
    return new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      t.assert.strictEqual(order.shift(), 3)
    })
  })

  server.onClose(async instance => {
    return new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      t.assert.strictEqual(order.shift(), 2)
    })
  })

  server.onClose(async () => {
    return new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      t.assert.strictEqual(order.shift(), 1)
    })
  })

  app.on('start', () => {
    app.close(() => {
      t.assert.strictEqual(order.shift(), 6)
      t.assert.ok('Closed in the correct order')
      done()
    })
  })
})

test('close callback receives close error from onClose callback', async (t) => {
  const app = boot()
  const error = new Error('close error')

  await app.ready()

  app.onClose(function (context, done) {
    t.assert.strictEqual(context, app._server)
    done(error)
  })

  await new Promise((resolve, reject) => {
    app.close((err) => {
      try {
        t.assert.strictEqual(err, error)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })
})

test('close callback receives close error from onClose promise', async (t) => {
  const app = boot()
  const error = new Error('close error')

  await app.ready()

  app.onClose(function () {
    return Promise.reject(error)
  })

  await new Promise((resolve, reject) => {
    app.close((err) => {
      try {
        t.assert.strictEqual(err, error)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })
})

test('close without callback returns rejected promise on error', async (t) => {
  const app = boot()
  const error = new Error('close error')

  await app.ready()

  app.onClose(function () {
    return Promise.reject(error)
  })

  await t.assert.rejects(app.close(), error)
})

test('onClose handler receives context', async (t) => {
  const server = {}
  const app = boot(server)

  let receivedContext

  app.onClose(function (context) {
    receivedContext = context
  })

  await app.ready()
  await app.close()

  t.assert.strictEqual(receivedContext, server)
})

test('onClose handler with promise receives context', async (t) => {
  const server = {}
  const app = boot(server)

  let receivedContext
  let called = false

  app.onClose(function (context) {
    receivedContext = context

    return new Promise((resolve) => {
      setImmediate(() => {
        called = true
        resolve()
      })
    })
  })

  await app.ready()
  await app.close()

  t.assert.strictEqual(receivedContext, server)
  t.assert.strictEqual(called, true)
})

test('onClose promise rejection is propagated', async (t) => {
  const app = boot()
  const error = new Error('onClose failed')

  app.onClose(function () {
    return Promise.reject(error)
  })

  await app.ready()

  await t.assert.rejects(app.close(), error)
})

test('onClose callback can complete asynchronously', async (t) => {
  const app = boot()
  let called = false

  app.onClose(function (context, done) {
    setImmediate(() => {
      called = true
      done()
    })
  })

  await app.ready()
  await app.close()

  t.assert.strictEqual(called, true)
})

test('close callback receives null on success', async (t) => {
  const app = boot()

  await app.ready()

  await new Promise((resolve, reject) => {
    app.close((err) => {
      try {
        t.assert.strictEqual(err, null)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })
})

test('close succeeds without onClose handlers', async () => {
  const app = boot()

  await app.ready()
  await app.close()
})

test('onClose handlers run in registration order', async (t) => {
  const app = boot()
  const calls = []

  app.onClose(function () {
    calls.push(1)
  })

  app.onClose(function () {
    calls.push(2)
  })

  await app.ready()
  await app.close()

  t.assert.deepStrictEqual(calls, [2, 1])
})

test('onClose error is passed to the close callback', async (t) => {
  const app = boot()

  const firstError = new Error('first')
  const secondError = new Error('second')

  app.onClose(function () {
    return Promise.reject(firstError)
  })

  app.onClose(function () {
    return Promise.reject(secondError)
  })

  await app.ready()

  const error = await new Promise((resolve) => {
    app.close(resolve)
  })

  t.assert.strictEqual(error, firstError)
})

test('close callback is called once', async (t) => {
  const app = boot()

  await app.ready()

  let calls = 0

  await new Promise((resolve, reject) => {
    app.close((err) => {
      try {
        t.assert.strictEqual(err, null)
        calls++
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })

  t.assert.strictEqual(calls, 1)
})

test('onClose callback is called once', async (t) => {
  const app = boot()
  let calls = 0

  app.onClose(function (context, done) {
    calls++
    done()
    done()
  })

  await app.ready()
  await app.close()

  t.assert.strictEqual(calls, 1)
})

test('close emits close event once', async (t) => {
  const app = boot()
  let closes = 0

  app.on('close', () => {
    closes++
  })

  await app.ready()
  await app.close()

  t.assert.strictEqual(closes, 1)
})

test('onClose handler with three parameters receives context and callback', async (t) => {
  const app = boot()

  let receivedContext
  let receivedCallback
  let receivedThirdArgument

  app.onClose(function (context, cb, third) {
    receivedContext = context
    receivedCallback = cb
    receivedThirdArgument = third

    cb()
  })

  await app.ready()
  await app.close()

  t.assert.strictEqual(receivedContext, app._server)
  t.assert.strictEqual(typeof receivedCallback, 'function')
  t.assert.strictEqual(receivedThirdArgument, undefined)
})
