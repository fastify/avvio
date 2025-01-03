'use strict'

const { test } = require('node:test')
const boot = require('..')
const { AVV_ERR_EXPOSE_ALREADY_DEFINED, AVV_ERR_ATTRIBUTE_ALREADY_DEFINED } = require('../lib/errors')
const { kAvvio } = require('../lib/symbols')

for (const key of ['use', 'after', 'ready', 'onClose', 'close']) {
  test('throws if ' + key + ' is by default already there', (t) => {
    t.plan(1)

    const app = {}
    app[key] = () => { }

    t.assert.throws(() => boot(app), new AVV_ERR_EXPOSE_ALREADY_DEFINED(key, key))
  })

  test('throws if ' + key + ' is already there', (t) => {
    t.plan(1)

    const app = {}
    app['cust' + key] = () => { }

    t.assert.throws(() => boot(app, { expose: { [key]: 'cust' + key } }), new AVV_ERR_EXPOSE_ALREADY_DEFINED('cust' + key, key))
  })

  test('support expose for ' + key, (t, testDone) => {
    const app = {}
    app[key] = () => { }

    const expose = {}
    expose[key] = 'muahah'

    boot(app, {
      expose
    })

    testDone()
  })
}

test('set the kAvvio to true on the server', (t) => {
  t.plan(1)

  const server = {}
  boot(server)

  t.assert.ok(server[kAvvio])
})

test('.then()', (t, testDone) => {
  t.plan(3)

  t.test('.then() can not be overwritten', (t, testDone) => {
    t.plan(1)

    const server = {
      then: () => {}
    }
    t.assert.throws(() => boot(server), AVV_ERR_ATTRIBUTE_ALREADY_DEFINED('then'))
    testDone()
  })

  t.test('.then() is a function', (t, testDone) => {
    t.plan(1)

    const server = {}
    boot(server)
    console.log(typeof server.then, 'typeof server.then')
    t.assert.strictEqual(typeof server.then, 'function')
    testDone()
  })

  t.test('.then() can not be overwritten', (t, testDone) => {
    t.plan(1)

    const server = {}
    boot(server)

    t.assert.throws(() => { server.then = 'invalid' }, TypeError('Cannot set property then of #<Object> which has only a getter'))
    testDone()
  })

  process.nextTick(testDone)
})
