const test = require('node:test').test
const Avvio = require('../avvio')

test('Avvio#ready', async (t) => {
  const test = t.test.bind(t)
  await test('await ready()', async (t) => {
    t.plan(4)
    let counter = 0
    const avvio = Avvio()
    avvio.use((context, _, done) => {
      counter++
      t.assert.strictEqual(counter, 1)
      context.use((context, _, done) => {
        counter++
        t.assert.strictEqual(counter, 2)
        done()
      })
      done()
    })
    const context = await avvio.ready()
    t.assert.strictEqual(counter, 2)
    t.assert.deepStrictEqual(context, avvio)
  })

  await test('await ready()', async (t) => {
    t.plan(4)
    let counter = 0
    const avvio = Avvio()
    avvio.use((context, _, done) => {
      counter++
      t.assert.strictEqual(counter, 1)
      context.use((context, _, done) => {
        counter++
        t.assert.strictEqual(counter, 2)
        setImmediate(done)
      })
      setImmediate(done)
    })
    const context = await avvio.ready()
    t.assert.strictEqual(counter, 2)
    t.assert.deepStrictEqual(context, avvio)
  })

  await test('ready(callback)', (t, done) => {
    t.plan(3)
    let counter = 0
    const avvio = Avvio()
    avvio.use((context, _, done) => {
      counter++
      t.assert.strictEqual(counter, 1)
      context.use((context, _, done) => {
        counter++
        t.assert.strictEqual(counter, 2)
        done()
      })
      done()
    })
    avvio.ready(() => {
      t.assert.strictEqual(counter, 2)
      done()
    })
  })

  await test('ready(callback)', (t, done) => {
    t.plan(3)
    let counter = 0
    const avvio = Avvio()
    avvio.use((context, _, done) => {
      counter++
      t.assert.strictEqual(counter, 1)
      context.use((context, _, done) => {
        counter++
        t.assert.strictEqual(counter, 2)
        setImmediate(done)
      })
      setImmediate(done)
    })
    avvio.ready(() => {
      t.assert.strictEqual(counter, 2)
      done()
    })
  })
})
