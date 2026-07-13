'use strict'

const { test } = require('node:test')
const boot = require('../..')

for (const timeout of [0, 10000]) {
  test(`synchronous ready callbacks do not overflow the stack with a ${timeout} ms timeout`, async (t) => {
    const app = boot({}, { timeout })
    const total = 10000
    let completed = 0

    app.use((server, options, done) => done())

    for (let i = 0; i < total; i++) {
      app.ready((err, context, done) => {
        if (err) {
          done(err)
          return
        }

        completed++

        // Fastify wraps callback-style hooks this way so that thrown hook
        // errors are forwarded to Avvio.
        try {
          done()
        } catch (error) {
          done(error)
        }
      })
    }

    await app.ready()

    t.assert.strictEqual(completed, total)
  })

  test(`ready callbacks complete only once with a ${timeout} ms timeout`, async () => {
    const app = boot({}, { timeout })

    app.ready((err, context, done) => {
      done(err)
      done(new Error('should be ignored'))
    })

    await app.ready()
  })
}
