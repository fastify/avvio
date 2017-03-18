'use strict'

const test = require('tap').test
const boot = require('..')

test('custom inheritance', (t) => {
  t.plan(3)

  const server = { my: 'server' }
  const app = boot(server)

  app.override = function (s) {
    t.equal(s, server)

    const res = Object.create(s)
    res.b = 42

    return res
  }

  app.use(function first (s, opts, cb) {
    t.notEqual(s, server)
    t.ok(server.isPrototypeOf(s))
    cb()
  })
})

test('custom inheritance multiple levels', (t) => {
  t.plan(6)

  const server = { count: 0 }
  const app = boot(server)

  app.override = function (s) {
    const res = Object.create(s)
    res.count = res.count + 1

    return res
  }

  app.use(function first (s1, opts, cb) {
    t.notEqual(s1, server)
    t.ok(server.isPrototypeOf(s1))
    t.equal(s1.count, 1)
    s1.use(second, cb)

    function second (s2, opts, cb) {
      t.notEqual(s2, s1)
      t.ok(s1.isPrototypeOf(s2))
      t.equal(s2.count, 2)
      cb()
    }
  })
})

test('custom inheritance multiple levels with multiple heads', (t) => {
  t.plan(13)

  const server = { count: 0 }
  const app = boot(server)

  app.override = function (s) {
    const res = Object.create(s)
    res.count = res.count + 1

    return res
  }

  app.use(function first (s1, opts, cb) {
    t.notEqual(s1, server)
    t.ok(server.isPrototypeOf(s1))
    t.equal(s1.count, 1)
    s1.use(second, cb)

    function second (s2, opts, cb) {
      t.notEqual(s2, s1)
      t.ok(s1.isPrototypeOf(s2))
      t.equal(s2.count, 2)
      cb()
    }
  })

  app.use(function third (s1, opts, cb) {
    t.notEqual(s1, server)
    t.ok(server.isPrototypeOf(s1))
    t.equal(s1.count, 1)
    s1.use(fourth, cb)

    function fourth (s2, opts, cb) {
      t.notEqual(s2, s1)
      t.ok(s1.isPrototypeOf(s2))
      t.equal(s2.count, 2)
      cb()
    }
  })

  app.ready(function () {
    t.equal(server.count, 0)
  })
})

test('fastify test case', (t) => {
  t.plan(7)

  const noop = () => {}

  function build () {
    const app = boot(server, {})
    app.override = function (s) {
      return Object.create(s)
    }

    server.add = function (name, fn, cb) {
      if (this[name]) return cb(new Error('already existent'))
      this[name] = fn
      cb()
    }

    return server

    function server (req, res) {}
  }

  const instance = build()
  t.ok(instance.add)
  t.ok(instance.use)

  instance.use((i, opts, cb) => {
    t.notEqual(i, instance)
    t.ok(instance.isPrototypeOf(i))

    i.add('test', noop, (err) => {
      t.error(err)
      t.ok(i.test)
      cb()
    })
  })

  instance.ready(() => {
    t.notOk(instance.test)
  })
})