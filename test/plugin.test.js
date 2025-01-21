const test = require('node:test').test
const Avvio = require('../avvio')

test('plugin signatures', async (t) => {
  const test = t.test.bind(t)
  await test('() => void', (t, done) => {
    t.plan(2)
    const avvio = Avvio()
    avvio.use(() => {
      t.assert.ok(true, 'plugin executed')
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('() => Promise<void>', (t, done) => {
    t.plan(2)
    const avvio = Avvio()
    avvio.use(() => {
      t.assert.ok(true, 'plugin executed')
      return Promise.resolve()
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('(context) => void', (t, done) => {
    t.plan(3)
    const avvio = Avvio()
    avvio.use((context) => {
      t.assert.deepStrictEqual(context, avvio)
      t.assert.ok(true, 'plugin executed')
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('(context) => Promise<void>', (t, done) => {
    t.plan(3)
    const avvio = Avvio()
    avvio.use((context) => {
      t.assert.deepStrictEqual(context, avvio)
      t.assert.ok(true, 'plugin executed')
      return Promise.resolve()
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('(context, options) => void', (t, done) => {
    t.plan(4)
    const avvio = Avvio()
    avvio.use((context, options) => {
      t.assert.deepStrictEqual(context, avvio)
      t.assert.deepStrictEqual(options, {})
      t.assert.ok(true, 'plugin executed')
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('(context, options) => Promise<void>', (t, done) => {
    t.plan(4)
    const avvio = Avvio()
    avvio.use((context, options) => {
      t.assert.deepStrictEqual(context, avvio)
      t.assert.deepStrictEqual(options, {})
      t.assert.ok(true, 'plugin executed')
      return Promise.resolve()
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('(context, options, done) => void', (t, done) => {
    t.plan(4)
    const avvio = Avvio()
    avvio.use((context, options, done) => {
      t.assert.deepStrictEqual(context, avvio)
      t.assert.deepStrictEqual(options, {})
      t.assert.ok(true, 'plugin executed')
      done()
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('(context, options, done) => Promise<void>', (t, done) => {
    t.plan(4)
    const avvio = Avvio()
    avvio.use((context, options, done) => {
      t.assert.deepStrictEqual(context, avvio)
      t.assert.deepStrictEqual(options, {})
      t.assert.ok(true, 'plugin executed')
      return Promise.resolve()
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('async () => Promise<void>', (t, done) => {
    t.plan(2)
    const avvio = Avvio()
    avvio.use(async () => {
      t.assert.ok(true, 'plugin executed')
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('async (context) => Promise<void>', (t, done) => {
    t.plan(3)
    const avvio = Avvio()
    avvio.use(async (context) => {
      t.assert.deepStrictEqual(context, avvio)
      t.assert.ok(true, 'plugin executed')
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('async (context, options) => Promise<void>', (t, done) => {
    t.plan(4)
    const avvio = Avvio()
    avvio.use(async (context, options) => {
      t.assert.deepStrictEqual(context, avvio)
      t.assert.deepStrictEqual(options, {})
      t.assert.ok(true, 'plugin executed')
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })

  await test('async (context, options, done) => Promise<void>', (t, done) => {
    t.plan(4)
    const avvio = Avvio()
    avvio.use(async (context, options, done) => {
      t.assert.deepStrictEqual(context, avvio)
      t.assert.deepStrictEqual(options, {})
      t.assert.ok(true, 'plugin executed')
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      done()
    })
  })
})

test('plugin orders', async (t) => {
  const test = t.test.bind(t)
  await test('sequential on same level', (t, done) => {
    t.plan(5)
    let counter = 0
    const avvio = Avvio()
    avvio.use(() => {
      counter++
      t.assert.strictEqual(counter, 1)
    })
    avvio.use(() => {
      counter++
      t.assert.strictEqual(counter, 2)
      return Promise.resolve()
    })
    avvio.use(async () => {
      counter++
      t.assert.strictEqual(counter, 3)
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      t.assert.strictEqual(counter, 3)
      done()
    })
  })

  await test('sequential on nested level', (t, done) => {
    t.plan(14)
    let counter = 0
    const avvio = Avvio()
    avvio.use((context) => {
      counter++
      t.assert.strictEqual(counter, 1)
      context.use(() => {
        counter++
        t.assert.strictEqual(counter, 2)
      })
      context.use(() => {
        counter++
        t.assert.strictEqual(counter, 3)
        return Promise.resolve()
      })
      context.use(async () => {
        counter++
        t.assert.strictEqual(counter, 4)
      })
    })
    avvio.use((context) => {
      counter++
      t.assert.strictEqual(counter, 5)
      context.use(() => {
        counter++
        t.assert.strictEqual(counter, 6)
      })
      context.use(() => {
        counter++
        t.assert.strictEqual(counter, 7)
        return Promise.resolve()
      })
      context.use(async () => {
        counter++
        t.assert.strictEqual(counter, 8)
      })
    })
    avvio.use(async (context) => {
      counter++
      t.assert.strictEqual(counter, 9)
      context.use(() => {
        counter++
        t.assert.strictEqual(counter, 10)
      })
      context.use(() => {
        counter++
        t.assert.strictEqual(counter, 11)
        return Promise.resolve()
      })
      context.use(async () => {
        counter++
        t.assert.strictEqual(counter, 12)
      })
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      t.assert.strictEqual(counter, 12)
      done()
    })
  })

  await test('sequential on deep nested', (t, done) => {
    t.plan(15)
    let counter = 0
    const avvio = Avvio()
    avvio.use((context) => {
      counter++
      t.assert.strictEqual(counter, 1)
      context.use((context) => {
        counter++
        t.assert.strictEqual(counter, 2)
        context.use(() => {
          counter++
          t.assert.strictEqual(counter, 3)
        })
        context.use(() => {
          counter++
          t.assert.strictEqual(counter, 4)
          return Promise.resolve()
        })
        context.use(async () => {
          counter++
          t.assert.strictEqual(counter, 5)
        })
      })
      context.use(() => {
        counter++
        t.assert.strictEqual(counter, 6)
        context.use(() => {
          counter++
          t.assert.strictEqual(counter, 7)
        })
        context.use(() => {
          counter++
          t.assert.strictEqual(counter, 8)
          return Promise.resolve()
        })
        context.use(async () => {
          counter++
          t.assert.strictEqual(counter, 9)
          context.use(() => {
            counter++
            t.assert.strictEqual(counter, 10)
          })
          context.use(() => {
            counter++
            t.assert.strictEqual(counter, 11)
            return Promise.resolve()
          })
          context.use(async () => {
            counter++
            t.assert.strictEqual(counter, 12)
          })
        })
        return Promise.resolve()
      })
      context.use(async () => {
        counter++
        t.assert.strictEqual(counter, 13)
      })
    })
    avvio.ready((error) => {
      t.assert.ifError(error)
      t.assert.strictEqual(counter, 13)
      done()
    })
  })
})
