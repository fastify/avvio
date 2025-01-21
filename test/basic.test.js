const { test } = require('node:test')
const { Avvio } = require('../avvio')

test('Avvio#constructor', async (t) => {
  const test = t.test.bind(t)
  await test('()', (t, done) => {
    t.plan(1)

    const avvio = Avvio()
    avvio.once('start', () => {
      t.assert.ok(true, 'booted')
      done()
    })
  })

  await test('({ autostart: false })', (t, done) => {
    t.plan(2)

    const avvio = Avvio({}, { autostart: false })
    avvio.once('start', () => {
      t.assert.ok(true, 'booted')
      done()
    })
    const app = avvio.start()
    t.assert.deepStrictEqual(avvio, app, 'chainable')
  })

  await test('(callback)', (t, done) => {
    t.plan(3)
    const avvio = Avvio(() => {
      t.assert.ok(true, 'booted')
      done()
    })

    avvio.use(function (context, options, done) {
      t.assert.deepStrictEqual(avvio, context, 'context is the same as avvio')
      t.assert.deepStrictEqual(options, {}, 'provides empty options')
      done()
    })
  })

  await test('(context, callback)', (t, done) => {
    t.plan(3)
    const instance = {}
    const avvio = Avvio(instance, () => {
      t.assert.ok(true, 'booted')
      done()
    })

    avvio.use(function (context, options, done) {
      t.assert.deepStrictEqual(instance, context, 'context is the same as specified one')
      t.assert.deepStrictEqual(options, {}, 'provides empty options')
      done()
    })
  })
})

test('automatic start with plugin', (t, done) => {
  t.plan(4)

  const avvio = Avvio()
  let after = false

  avvio.use(function (context, options, done) {
    t.assert.deepStrictEqual(avvio, context, 'context is the same as avvio')
    t.assert.deepStrictEqual(options, {}, 'provides empty options')
    t.assert.ok(after, 'delayed execution')
    done()
  })

  after = true

  avvio.once('start', () => {
    t.assert.ok(true, 'booted')
    done()
  })
})

test('automatic start with promisified plugin', (t, done) => {
  t.plan(4)

  const avvio = Avvio()
  let after = false

  avvio.use(function (context, options) {
    t.assert.deepStrictEqual(avvio, context, 'context is the same as avvio')
    t.assert.deepStrictEqual(options, {}, 'provides empty options')
    t.assert.ok(after, 'delayed execution')
    return Promise.resolve()
  })

  after = true

  avvio.once('start', () => {
    t.assert.ok(true, 'booted')
    done()
  })
})
