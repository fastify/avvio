'use strict'

const { test } = require('tap')
const boot = require('..')

test('await use - nested plugins with same tick callbacks', async (t) => {
  const app = {}
  boot(app)

  t.plan(4)

  await app.use((f, opts, cb) => {
    t.pass('plugin init')
    app.use((f, opts, cb) => {
      t.pass('plugin2 init')
      cb()
    })
    cb()
  })
  t.pass('reachable')

  await app.ready()
  t.pass('reachable')
})

test('await use - nested plugins with future tick callbacks', async (t) => {
  const app = {}
  boot(app)

  t.plan(4)

  await app.use((f, opts, cb) => {
    t.pass('plugin init')
    app.use((f, opts, cb) => {
      t.pass('plugin2 init')
      setImmediate(cb)
    })
    setImmediate(cb)
  })
  t.pass('reachable')

  await app.ready()
  t.pass('reachable')
})

test('await use - nested async function plugins', async (t) => {
  const app = {}
  boot(app)

  t.plan(5)

  await app.use(async (f, opts) => {
    t.pass('plugin init')
    await app.use(async (f, opts) => {
      t.pass('plugin2 init')
    })
    t.pass('reachable')
  })
  t.pass('reachable')

  await app.ready()
  t.pass('reachable')
})

test('await use - promise returning function plugins + promise chaining', async (t) => {
  const app = {}
  boot(app)

  t.plan(6)

  await app.use((f, opts) => {
    t.pass('plugin init')
    return app.use((f, opts) => {
      t.pass('plugin2 init')
      return Promise.resolve()
    }).then(() => {
      t.pass('reachable')
      return 'test'
    }).then((val) => {
      t.is(val, 'test')
    })
  })
  t.pass('reachable')

  await app.ready()
  t.pass('reachable')
})

test('await use - await and use chaining', async (t) => {
  const app = {}
  boot(app)

  t.plan(3)

  app.use(async (f, opts, cb) => {
    await app.use(async (f, opts) => {
      t.pass('plugin init')
    }).use(async (f, opts) => {
      t.pass('plugin2 init')
    })
  })

  await app.ready()
  t.pass('reachable')
})

function thenableRejects (t, thenable, err, msg) {
  return t.rejects(async () => { await thenable }, err, msg)
}

test('await use - error handling, async throw', async (t) => {
  const app = {}
  boot(app)

  t.plan(2)

  await thenableRejects(t, app.use(async (f, opts) => {
    throw Error('kaboom')
  }), Error('kaboom'))

  await t.rejects(app.ready(), Error('kaboom'))
})

test('await use - error handling, async throw, nested', async (t) => {
  const app = {}
  boot(app)

  t.plan(2)

  await thenableRejects(t, app.use(async function a (f, opts) {
    await app.use(async function b (f, opts) {
      throw Error('kaboom')
    })
  }, Error('kaboom')), 'b')

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await use - error handling, same tick cb err', async (t) => {
  const app = {}
  boot(app)

  t.plan(2)

  await thenableRejects(t, app.use((f, opts, cb) => {
    cb(Error('kaboom'))
  }), Error('kaboom'))

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await use - error handling, same tick cb err, nested', async (t) => {
  const app = {}
  boot(app)

  t.plan(2)

  await thenableRejects(t, app.use((f, opts, cb) => {
    app.use((f, opts, cb) => {
      cb(Error('kaboom'))
    })
    cb()
  }), Error('kaboom'))

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await use - error handling, future tick cb err', async (t) => {
  const app = {}
  boot(app)

  t.plan(2)

  await thenableRejects(t, app.use((f, opts, cb) => {
    setImmediate(() => { cb(Error('kaboom')) })
  }), Error('kaboom'))

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await use - error handling, future tick cb err, nested', async (t) => {
  const app = {}
  boot(app)

  t.plan(2)

  await thenableRejects(t, app.use((f, opts, cb) => {
    app.use((f, opts, cb) => {
      setImmediate(() => { cb(Error('kaboom')) })
    })
    cb()
  }), Error('kaboom'))

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('mixed await use and non-awaited use ', async (t) => {
  const app = {}
  boot(app)
  t.plan(16)

  let firstLoaded = false
  let secondLoaded = false
  let thirdLoaded = false
  let fourthLoaded = false

  await app.use(first)
  t.ok(firstLoaded, 'first is loaded')
  t.notOk(secondLoaded, 'second is not loaded')
  t.notOk(thirdLoaded, 'third is not loaded')
  t.notOk(fourthLoaded, 'fourth is not loaded')
  app.use(second)
  t.ok(firstLoaded, 'first is loaded')
  t.notOk(secondLoaded, 'second is not loaded')
  t.notOk(thirdLoaded, 'third is not loaded')
  t.notOk(fourthLoaded, 'fourth is not loaded')
  await app.use(third)
  t.ok(firstLoaded, 'first is loaded')
  t.ok(secondLoaded, 'second is loaded')
  t.ok(thirdLoaded, 'third is loaded')
  t.ok(fourthLoaded, 'fourth is loaded')
  await app.ready()
  t.ok(firstLoaded, 'first is loaded')
  t.ok(secondLoaded, 'second is loaded')
  t.ok(thirdLoaded, 'third is loaded')
  t.ok(fourthLoaded, 'fourth is loaded')

  async function first () {
    firstLoaded = true
  }

  async function second () {
    secondLoaded = true
  }

  async function third (app) {
    thirdLoaded = true
    app.use(fourth)
  }

  async function fourth () {
    fourthLoaded = true
  }
})
