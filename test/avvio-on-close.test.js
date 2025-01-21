const test = require('node:test').test
const Avvio = require('../avvio')

test('Avvio#onClose', async (t) => {
  const test = t.test.bind(t)

  await test('() => void', (t, done) => {
    t.plan(1)
    const avvio = Avvio()
    avvio.onClose(() => {
      t.assert.ok(true, 'executed')
    })
    avvio.close(() => done())
  })

  await test('() => Promise<void>', (t, done) => {
    t.plan(1)
    const avvio = Avvio()
    avvio.onClose(() => {
      t.assert.ok(true, 'executed')
      return Promise.resolve()
    })
    avvio.close(() => done())
  })

  await test('(context) => void', (t, done) => {
    t.plan(2)
    const avvio = Avvio()
    avvio.onClose((context) => {
      t.assert.strictEqual(context, avvio)
      t.assert.ok(true, 'executed')
    })
    avvio.close(() => done())
  })

  await test('(context) => Promise<void>', (t, done) => {
    t.plan(2)
    const avvio = Avvio()
    avvio.onClose((context) => {
      t.assert.strictEqual(context, avvio)
      t.assert.ok(true, 'executed')
      return Promise.resolve()
    })
    avvio.close(() => done())
  })

  await test('(context, done) => void', (t, done) => {
    t.plan(2)
    const avvio = Avvio()
    avvio.onClose((context, done) => {
      t.assert.strictEqual(context, avvio)
      t.assert.ok(true, 'executed')
      setImmediate(done)
    })
    avvio.close(() => done())
  })

  await test('(context, done) => Promise<void>', (t, done) => {
    t.plan(2)
    const avvio = Avvio()
    avvio.onClose((context, done) => {
      t.assert.strictEqual(context, avvio)
      t.assert.ok(true, 'executed')
      return Promise.resolve()
    })
    avvio.close(() => done())
  })

  await test('execution order', (t, done) => {
    t.plan(3)
    const counter = 0
    const avvio = Avvio()
    avvio.onClose(() => {
      t.assert.strictEqual(counter, 3)
    })
    avvio.onClose(async () => {
      t.assert.strictEqual(counter, 2)
    })
    avvio.onClose(() => {
      t.assert.strictEqual(counter, 1)
      return Promise.resolve()
    })
    avvio.close(() => done())
  })
})
