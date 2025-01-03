'use strict'

const { test } = require('node:test')
const boot = require('..')
const { AVV_ERR_CALLBACK_NOT_FN } = require('../lib/errors')

test('boot an app with a plugin', (t, testDone) => {
  t.plan(4)

  const app = boot()
  let last = false

  app.use(function (server, opts, done) {
    app.onClose(() => {
      t.assert.ok('onClose called')
      t.assert.strictEqual(last, false)
      last = true
    })
    done()
  })

  app.on('start', () => {
    app.close(() => {
      t.assert.ok(last)
      t.assert.ok('Closed in the correct order')
      testDone()
    })
  })
})

test('onClose arguments', (t, testDone) => {
  t.plan(5)

  const app = boot()

  app.use(function (server, opts, next) {
    server.onClose((instance, done) => {
      t.assert.ok('called')
      t.assert.deepStrictEqual(server, instance)
      done()
    })
    next()
  })

  app.use(function (server, opts, next) {
    server.onClose((instance) => {
      t.assert.ok('called')
      t.assert.deepStrictEqual(server, instance)
    })
    next()
  })

  app.on('start', () => {
    app.close(() => {
      t.assert.ok('Closed in the correct order')
      testDone()
    })
  })
})

test('onClose arguments - fastify encapsulation test case', (t, testDone) => {
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
    t.assert.strictEqual(instance.test, undefined)
    instance.onClose((i, done) => {
      t.assert.strictEqual(i.test, undefined)
      done()
    })
    next()
  })

  app.on('start', () => {
    t.assert.strictEqual(app.test, undefined)
    app.close(() => {
      t.assert.ok('Closed in the correct order')
      testDone()
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
    })
    next()
  })

  server.use(function (instance, opts, next) {
    t.assert.ok(!instance.test)
    instance.onClose((i, done) => {
      t.assert.strictEqual(i.test, undefined)
      done()
    })
    next()
  })

  app.on('start', () => {
    t.assert.strictEqual(server.test, undefined)
    try {
      server.close().then(testDone)
      t.assert.ok(true)
    } catch (err) {
      t.assert.fail(err)
    }
  })
})

test('onClose arguments - encapsulation test case no server', (t, testDone) => {
  t.plan(5)

  const app = boot()

  app.override = function (s, fn, opts) {
    s = Object.create(s)
    return s
  }

  app.use(function (instance, opts, next) {
    instance.test = true
    instance.onClose((i, done) => {
      t.assert.strictEqual(i.test, undefined)
      done()
    })
    next()
  })

  app.use(function (instance, opts, next) {
    t.assert.strictEqual(instance.test, undefined)
    instance.onClose((i) => {
      t.assert.strictEqual(i.test, undefined)
    })
    next()
  })

  app.on('start', () => {
    t.assert.strictEqual(app.test, undefined)
    app.close(() => {
      t.assert.ok('Closed in the correct order')
      testDone()
    })
  })
})

test('onClose should handle errors', (t, testDone) => {
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
      testDone()
    })
  })
})

test('#54 close handlers should receive same parameters when queue is not empty', (t, testDone) => {
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
      testDone()
    })
  })
})

test('onClose should handle errors / 2', (t, testDone) => {
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
      testDone()
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
      t.assert.deepStrictEqual(instance, app)
      done()
      t.assert.ok('Closed in the correct order')
      testDone()
    })
  })
})

test('close event', (t, testDone) => {
  t.plan(3)

  const app = boot()
  let last = false

  app.on('start', () => {
    app.close(() => {
      t.assert.strictEqual(last, false)
      last = true
    })
  })

  app.on('close', () => {
    t.assert.ok(last)
    t.assert.ok('event fired')
    testDone()
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

test('close passing not a function', (t, testDone) => {
  t.plan(1)

  const app = boot()

  app.onClose((instance, done) => {
    t.assert.ok('called')
    done()
  })

  t.assert.throws(() => app.close({}), 'not a function')
  testDone()
})

test('close passing not a function when wrapping', (t, testDone) => {
  t.plan(1)

  const app = {}
  boot(app)

  app.onClose((instance, done) => {
    t.assert.ok('called')
    done()
  })

  t.assert.throws(() => app.close({}), 'not a function')
  testDone()
})

test('close should trigger ready()', (t, testDone) => {
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
    testDone()
  })
})

test('close without a cb returns a promise', (t, testDone) => {
  t.plan(1)

  const app = boot()
  app.close().then(() => {
    t.assert.ok('promise resolves')
    testDone()
  })
})

test('close without a cb returns a promise when attaching to a server', (t, testDone) => {
  t.plan(1)

  const server = {}
  boot(server)
  server.close().then(() => {
    t.assert.ok('promise resolves')
    testDone()
  })
})

test('close with async onClose handlers', (t, testDone) => {
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
      testDone()
    })
  })
})

test('onClose callback must be a function', (t, testDone) => {
  t.plan(1)

  const app = boot()

  app.use(function (server, opts, done) {
    t.assert.throws(() => app.onClose({}), new AVV_ERR_CALLBACK_NOT_FN('onClose', 'object'))
    done()
    testDone()
  })
})

test('close custom server with async onClose handlers', (t, testDone) => {
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
      testDone()
    })
  })
})
