'use strict'

const { test } = require('tap')
const boot = require('..')

test('await self', async (t) => {
  const app = {}
  boot(app)

  t.is(await app, app)
})

test('await self three times', async (t) => {
  const app = {}
  boot(app)

  t.is(await app, app)
  t.is(await app, app)
  t.is(await app, app)
})

test('await self within plugin', async (t) => {
  const app = {}
  boot(app)

  app.use(async (f) => {
    t.is(await f, f)
  })

  t.is(await app, app)
})
