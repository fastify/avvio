'use strict'

const test = require('tap').test
const sleep = require('then-sleep')

const boot = require('..')

test('one level', async (t) => {
  t.plan(14)

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

  const readyContext = await app.ready()

  t.equal(app, readyContext)
  t.ok(firstLoaded, 'first is loaded')
  t.ok(secondLoaded, 'second is loaded')
  t.ok(thirdLoaded, 'third is loaded')
  t.pass('booted')
})

test('multiple reentrant plugin loading', async (t) => {
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

  await app.ready()
  t.ok(firstLoaded, 'first is loaded')
  t.ok(secondLoaded, 'second is loaded')
  t.ok(thirdLoaded, 'third is loaded')
  t.ok(fourthLoaded, 'fourth is loaded')
  t.ok(fifthLoaded, 'fifth is loaded')
  t.pass('booted')
})

test('async ready plugin registration (errored)', async (t) => {
  t.plan(1)

  const app = boot()

  app.use(async (server, opts) => {
    await sleep(10)
    throw new Error('kaboom')
  })

  try {
    await app.ready()
    t.fail('we should not be here')
  } catch (err) {
    t.is(err.message, 'kaboom')
  }
})

test('after', async (t) => {
  t.plan(15)

  const app = boot()
  let firstLoaded = false
  let secondLoaded = false
  let thirdLoaded = false

  app.use(first)

  async function first (s, opts) {
    t.notOk(firstLoaded, 'first is not loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    firstLoaded = true
    s.after(second)
    s.after(third)
  }

  async function second (err) {
    t.error(err)
    t.ok(firstLoaded, 'first is loaded')
    t.notOk(secondLoaded, 'second is not loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    await sleep(10)
    secondLoaded = true
  }

  async function third () {
    t.ok(firstLoaded, 'first is loaded')
    t.ok(secondLoaded, 'second is loaded')
    t.notOk(thirdLoaded, 'third is not loaded')
    await sleep(10)
    thirdLoaded = true
  }

  const readyContext = await app.ready()

  t.equal(app, readyContext)
  t.ok(firstLoaded, 'first is loaded')
  t.ok(secondLoaded, 'second is loaded')
  t.ok(thirdLoaded, 'third is loaded')
  t.pass('booted')
})
