'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')

const { Plugin } = require('../lib/plugin')

function createQueue (length = 0, running = 0) {
  return {
    _length: length,
    _running: running,
    drain: () => {},
    pause () {},
    resume () {},
    push () {},
    length () {
      return this._length
    },
    running () {
      return this._running
    }
  }
}

test('loadedSoFar returns resolved promise when already waiting for load', async () => {
  const queue = createQueue()

  const plugin = new Plugin(
    queue,
    function plugin () {},
    {},
    false,
    0
  )

  plugin.server = {
    after () {}
  }

  const first = plugin.loadedSoFar()
  assert.ok(plugin._promise)

  const promise = plugin.loadedSoFar()

  assert.equal(plugin._promise !== null, true)
  await assert.doesNotReject(promise)

  plugin._promise.resolve()
  await first
})

test('finish does nothing when plugin is already loaded', async () => {
  const queue = createQueue()

  const plugin = new Plugin(
    queue,
    function plugin () {},
    {},
    false,
    0
  )

  plugin.loaded = true

  let callbackCalled = false

  plugin.finish(null, () => {
    callbackCalled = true
  })

  await new Promise(resolve => setImmediate(resolve))

  assert.equal(callbackCalled, false)
})

test('finish rejects existing promise when called with an error', async () => {
  const queue = createQueue()

  const plugin = new Plugin(
    queue,
    function plugin () {},
    {},
    false,
    0
  )

  plugin.server = {
    after () {}
  }

  const promise = plugin.loadedSoFar()

  assert.ok(plugin._promise)

  const error = new Error('plugin failed')

  let callbackError

  plugin.finish(error, (err) => {
    callbackError = err
  })

  assert.equal(callbackError, error)
  assert.equal(plugin._promise, null)

  await assert.rejects(promise, error)
})

test('finish resolves existing promise when queue is empty', async () => {
  const queue = createQueue(0, 0)

  const plugin = new Plugin(
    queue,
    function plugin () {},
    {},
    false,
    0
  )

  plugin.server = {
    after () {}
  }

  const promise = plugin.loadedSoFar()

  assert.ok(plugin._promise)

  let callbackCalled = false

  plugin.finish(null, (err) => {
    assert.equal(err, null)
    callbackCalled = true
  })

  await promise

  assert.equal(plugin._promise, null)
  assert.equal(callbackCalled, false)

  // The promise resolution schedules check() again.
  await new Promise(resolve => setImmediate(resolve))

  assert.equal(callbackCalled, true)
  assert.equal(plugin.loaded, true)
})

test('finish uses noop as drain handler', async () => {
  const queue = createQueue(1, 0)

  const plugin = new Plugin(
    queue,
    function plugin () {},
    {},
    false,
    0
  )

  let callbackCalled = false

  plugin.finish(null, () => {
    callbackCalled = true
  })

  // finish() schedules check() with queueMicrotask().
  await Promise.resolve()

  assert.equal(callbackCalled, false)
  assert.equal(typeof queue.drain, 'function')

  const drain = queue.drain

  queue._length = 0

  // Execute the drain handler installed by finish().
  drain()

  // The handler replaces itself with noop().
  assert.notEqual(queue.drain, drain)

  // Execute noop().
  queue.drain()

  await new Promise(resolve => setImmediate(resolve))

  assert.equal(callbackCalled, true)
  assert.equal(plugin.loaded, true)
})

test('exec emits start with null server name when server is not set', async () => {
  const queue = createQueue()

  const plugin = new Plugin(
    queue,
    function plugin (server, opts, done) {
      done()
    },
    {},
    false,
    0
  )

  let startEvent

  plugin.on('start', (...args) => {
    startEvent = args
  })

  await new Promise((resolve, reject) => {
    plugin.exec(null, (err) => {
      try {
        assert.equal(err, undefined)
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  })

  assert.equal(startEvent[0], null)
  assert.equal(startEvent[1], plugin.name)
  assert.equal(typeof startEvent[2], 'number')
})

test('enqueue emits null server name when server is not set', () => {
  const queue = createQueue()

  const plugin = new Plugin(
    queue,
    function plugin () {},
    {},
    false,
    0
  )

  const child = new Plugin(
    queue,
    function child () {},
    {},
    false,
    0
  )

  let enqueueEvent

  plugin.on('enqueue', (...args) => {
    enqueueEvent = args
  })

  plugin.enqueue(child, () => {})

  assert.equal(enqueueEvent[0], null)
  assert.equal(enqueueEvent[1], plugin.name)
  assert.equal(typeof enqueueEvent[2], 'number')
})
