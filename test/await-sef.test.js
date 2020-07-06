'use strict'

const { test } = require('tap')
const boot = require('..')

test('await self', async (t) => {
  const app = {}
  boot(app)

  t.is(await app, app)
})
