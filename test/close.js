'use strict'

const test = require('tap').test
const boot = require('..')

test('boot an app with a plugin', (t) => {
  t.plan(4)

  const app = boot()
  var last = false

  app.use(function (server, opts, done) {
    app.onClose(() => {
      t.ok('onClose called')
      t.notOk(last)
      last = true
    })
    done()
  })

  app.on('start', () => {
    app.close(() => {
      t.ok(last)
      t.pass('Closed in the correct order')
    })
  })
})

test('onClose arguments', (t) => {
  t.plan(5)

  const app = boot()

  app.use(function (server, opts, next) {
    server.onClose((instance, done) => {
      t.ok('called')
      t.equal(server, instance)
      done()
    })
    next()
  })

  app.use(function (server, opts, next) {
    server.onClose((instance) => {
      t.ok('called')
      t.equal(server, instance)
    })
    next()
  })

  app.on('start', () => {
    app.close(() => {
      t.pass('Closed in the correct order')
    })
  })
})

test('onClose arguments - fastify encapsulation test case', (t) => {
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
      t.ok(i.test)
      done()
    })
    next()
  })

  app.use(function (instance, opts, next) {
    t.notOk(instance.test)
    instance.onClose((i) => {
      t.notOk(i.test)
    })
    next()
  })

  app.on('start', () => {
    t.notOk(app.test)
    app.close(() => {
      t.pass('Closed in the correct order')
    })
  })
})

test('onClose arguments - encapsulation test case', (t) => {
  t.plan(5)

  const app = boot()

  app.override = function (s, fn, opts) {
    s = Object.create(s)
    return s
  }

  app.use(function (instance, opts, next) {
    instance.test = true
    instance.onClose((i, done) => {
      t.ok(i.test)
      done()
    })
    next()
  })

  app.use(function (instance, opts, next) {
    t.notOk(instance.test)
    instance.onClose((i) => {
      t.notOk(i.test)
    })
    next()
  })

  app.on('start', () => {
    t.notOk(app.test)
    app.close(() => {
      t.pass('Closed in the correct order')
    })
  })
})

test('onClose should handle errors', (t) => {
  t.plan(3)

  const app = boot()

  app.use(function (server, opts, done) {
    app.onClose((instance, done) => {
      t.ok('called')
      done(new Error('some error'))
    })
    done()
  })

  app.on('start', () => {
    app.close(err => {
      t.is(err.message, 'some error')
      t.pass('Closed in the correct order')
    })
  })
})

test('onClose should handle errors / 2', (t) => {
  t.plan(4)

  const app = boot()

  app.onClose((instance, done) => {
    t.ok('called')
    done(new Error('some error'))
  })

  app.use(function (server, opts, done) {
    app.onClose((instance, done) => {
      t.ok('called')
      done()
    })
    done()
  })

  app.on('start', () => {
    app.close(err => {
      t.is(err.message, 'some error')
      t.pass('Closed in the correct order')
    })
  })
})

test('close arguments', (t) => {
  t.plan(4)

  const app = boot()

  app.use(function (server, opts, done) {
    app.onClose((instance, done) => {
      t.ok('called')
      done()
    })
    done()
  })

  app.on('start', () => {
    app.close((err, instance, done) => {
      t.error(err)
      t.equal(instance, app)
      done()
      t.pass('Closed in the correct order')
    })
  })
})

test('close event', (t) => {
  t.plan(3)

  const app = boot()
  var last = false

  app.on('start', () => {
    app.close(() => {
      t.notOk(last)
      last = true
    })
  })

  app.on('close', () => {
    t.ok(last)
    t.pass('event fired')
  })
})

test('close order', (t) => {
  t.plan(5)

  const app = boot()
  var order = [1, 2, 3, 4]

  app.use(function (server, opts, done) {
    app.onClose(() => {
      t.is(order.shift(), 3)
    })

    app.use(function (server, opts, done) {
      app.onClose(() => {
        t.is(order.shift(), 2)
      })
      done()
    }, done)
  })

  app.use(function (server, opts, done) {
    app.onClose(() => {
      t.is(order.shift(), 1)
    })
    done()
  })

  app.on('start', () => {
    app.close(() => {
      t.is(order.shift(), 4)
      t.pass('Closed in the correct order')
    })
  })
})

test('close without a cb', (t) => {
  t.plan(1)

  const app = boot()

  app.onClose((instance, done) => {
    t.ok('called')
    done()
  })

  app.close()
})
