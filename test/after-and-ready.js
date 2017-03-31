'use strict'

const test = require('tap').test
const boot = require('..')

test('boot a plugin and then execute a call after that', (t) => {
  t.plan(5)

  const app = boot()
  let pluginLoaded = false
  let afterCalled = false

  app.use(function (s, opts, done) {
    t.notOk(afterCalled, 'after not called')
    pluginLoaded = true
    done()
  })

  app.after(function (err, cb) {
    t.error(err)
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
  t.plan(5)

  const app = boot()
  let pluginLoaded = false
  let afterCalled = false

  app.use(function (s, opts, done) {
    t.notOk(afterCalled, 'after not called')
    pluginLoaded = true
    done()
  })

  app.after(function (err) {
    t.error(err)
    t.ok(pluginLoaded, 'afterred!')
    afterCalled = true
  })

  app.on('start', () => {
    t.ok(afterCalled, 'after called')
    t.ok(pluginLoaded, 'plugin loaded')
  })
})

test('verify when a afterred call happens', (t) => {
  t.plan(3)

  const app = boot()

  app.use(function (s, opts, done) {
    done()
  })

  app.after(function (err, cb) {
    t.error(err)
    cb()
  }, function () {
    t.pass('afterred finished')
  })

  app.on('start', () => {
    t.pass('booted')
  })
})

test('internal after', (t) => {
  t.plan(18)

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
    s.after(function (err, cb) {
      t.error(err)
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
  t.plan(14)

  const app = boot()
  let pluginLoaded = false
  let afterCalled = false
  let readyCalled = false

  app.ready(function (err, cb) {
    t.error(err)
    t.ok(pluginLoaded, 'after the plugin')
    t.ok(afterCalled, 'after after')
    readyCalled = true
    process.nextTick(cb)
  })

  app.use(function (s, opts, done) {
    t.notOk(afterCalled, 'after not called')
    t.notOk(readyCalled, 'ready not called')
    pluginLoaded = true

    app.ready(function (err) {
      t.error(err)
      t.ok(readyCalled, 'after the first ready')
      t.ok(afterCalled, 'after the after callback')
    })

    done()
  })

  app.after(function (err, cb) {
    t.error(err)
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

test('if the after/ready callback has two parameters, the first one must be the context', (t) => {
  t.plan(4)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (s, opts, done) {
    done()
  })

  app.after(function (err, context, cb) {
    t.error(err)
    t.equal(server, context)
    cb()
  })

  app.ready(function (err, context, cb) {
    t.error(err)
    t.equal(server, context)
    cb()
  })
})

test('error should come in the first after - one parameter', (t) => {
  t.plan(3)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (s, opts, done) {
    done(new Error('err'))
  })

  app.after(function (err) {
    t.ok(err instanceof Error)
    t.is(err.message, 'err')
  })

  app.ready(function (err) {
    t.error(err)
  })
})

test('error should come in the first after - two parameters', (t) => {
  t.plan(3)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (s, opts, done) {
    done(new Error('err'))
  })

  app.after(function (err, cb) {
    t.ok(err instanceof Error)
    t.is(err.message, 'err')
    cb()
  })

  app.ready(function (err) {
    t.error(err)
  })
})

test('error should come in the first after - three parameter', (t) => {
  t.plan(4)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (s, opts, done) {
    done(new Error('err'))
  })

  app.after(function (err, context, cb) {
    t.ok(err instanceof Error)
    t.is(err.message, 'err')
    t.equal(context, server)
    cb()
  })

  app.ready(function (err) {
    t.error(err)
  })
})

test('error should come in the first ready - one parameter', (t) => {
  t.plan(2)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (s, opts, done) {
    done(new Error('err'))
  })

  app.ready(function (err) {
    t.ok(err instanceof Error)
    t.is(err.message, 'err')
  })
})

test('error should come in the first ready - two parameters', (t) => {
  t.plan(2)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (s, opts, done) {
    done(new Error('err'))
  })

  app.ready(function (err, cb) {
    t.ok(err instanceof Error)
    t.is(err.message, 'err')
    cb()
  })
})

test('error should come in the first ready - three parameters', (t) => {
  t.plan(3)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (s, opts, done) {
    done(new Error('err'))
  })

  app.ready(function (err, context, cb) {
    t.ok(err instanceof Error)
    t.is(err.message, 'err')
    t.equal(context, server)
    cb()
  })
})

test('if `use` has a callback with more then one parameter, the error must not reach ready', (t) => {
  t.plan(2)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (s, opts, done) {
    done(new Error('err'))
  }, err => {
    t.ok(err)
  })

  app.ready(function (err) {
    t.error(err)
  })
})

test('if `use` has a callback without parameters, the error must reach ready', (t) => {
  t.plan(1)

  const server = { my: 'server' }
  const app = boot(server)

  app.use(function (s, opts, done) {
    done(new Error('err'))
  }, () => {})

  app.ready(function (err) {
    t.ok(err)
  })
})
