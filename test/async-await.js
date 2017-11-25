'use strict'

const test = require('tap').test
const sleep = require('then-sleep')

const boot = require('..')

test('one level', (t) => {
  t.plan(13)

  const app = boot()
  let firstLoaded = false
  let secondLoaded = false
  let thirdLoaded = false

  app.use(first)
  app.use(third)

  async function first (s, opts) {
    t.notOk(firstLoaded, 'first is not loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    firstLoaded = true
    s.use(second)
  }

  async function second (s, opts) {
    t.ok(firstLoaded, 'first is loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    secondLoaded = true
  }

  async function third (s, opts) {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    thirdLoaded = true
  }

  app.on('start', () => {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.ok(thirdLoaded, 'third is loaded')
    t.pass('booted')
  })
})

test('multiple reentrant plugin loading', (t) => {
  t.plan(31)

  const app = boot()
  let firstLoaded = false
  let secondLoaded = false
  let thirdLoaded = false
  let fourthLoaded = false
  let fifthLoaded = false

  app.use(first)
  app.use(fifth)

  async function first (s, opts) {
    t.notOk(firstLoaded, 'first is not loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    t.notOk(fourthLoaded, 'fourth is not loaded')
    t.notOk(fifthLoaded, 'fifth is not loaded')
    firstLoaded = true
    s.use(second)
  }

  async function second (s, opts) {
    t.ok(firstLoaded, 'first is loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    t.notOk(fourthLoaded, 'fourth is not loaded')
    t.notOk(fifthLoaded, 'fifth is not loaded')
    secondLoaded = true
    s.use(third)
    await sleep(10)
    s.use(fourth)
  }

  async function third (s, opts) {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    t.notOk(fourthLoaded, 'fourth is not loaded')
    t.notOk(fifthLoaded, 'fifth is not loaded')
    thirdLoaded = true
  }

  async function fourth (s, opts) {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.ok(thirdLoaded, 'third is loaded')
    t.notOk(fourthLoaded, 'fourth is not loaded')
    t.notOk(fifthLoaded, 'fifth is not loaded')
    fourthLoaded = true
  }

  async function fifth (s, opts) {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.ok(thirdLoaded, 'third is loaded')
    t.ok(fourthLoaded, 'fourth is loaded')
    t.notOk(fifthLoaded, 'fifth is not loaded')
    fifthLoaded = true
  }

  app.on('start', () => {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.ok(thirdLoaded, 'third is loaded')
    t.ok(fourthLoaded, 'fourth is loaded')
    t.ok(fifthLoaded, 'fifth is loaded')
    t.pass('booted')
  })
})

test('wait plugin registration', async (t) => {
  const app = boot()

  await app.use(plugin).wait()

  async function plugin (instance, opts) {
    t.ok('called')
  }
})

test('wait plugin registration (multiple)', async (t) => {
  const app = boot()

  await app
    .use(plugin)
    .use(plugin)
    .use(plugin)
    .wait()

  async function plugin (instance, opts) {
    t.ok('called')
  }
})

test('wait plugin registration (errored)', async (t) => {
  const app = boot()

  try {
    await app.use(plugin).wait()
  } catch (err) {
    t.is(err.message, 'kaboom')
  }

  async function plugin (instance, opts) {
    t.ok('called')
    throw new Error('kaboom')
  }
})
