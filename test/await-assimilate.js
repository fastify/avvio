'use strict'

const { test } = require('tap')
const boot = require('..')

test('await assimilate - nested plugins with same tick callbacks', async (t) => {
  const app = {}
  boot(app)

  t.plan(4)

  app.use((f, opts, cb) => {
    t.pass('plugin init')
    app.use((f, opts, cb) => {
      t.pass('plugin2 init')
      cb()
    })
    cb()
  })
  await app.assimilate()
  t.pass('reachable')

  await app.ready()
  t.pass('reachable')
})

test('await assimilate - nested plugins with future tick callbacks', async (t) => {
  const app = {}
  boot(app)

  t.plan(4)

  app.use((f, opts, cb) => {
    t.pass('plugin init')
    app.use((f, opts, cb) => {
      t.pass('plugin2 init')
      setImmediate(cb)
    })
    setImmediate(cb)
  })
  await app.assimilate()
  t.pass('reachable')

  await app.ready()
  t.pass('reachable')
})

test('await assimilate - nested async function plugins', async (t) => {
  const app = {}
  boot(app)

  t.plan(5)

  app.use(async (f, opts) => {
    t.pass('plugin init')
    await app.use(async (f, opts) => {
      t.pass('plugin2 init')
    })
    t.pass('reachable')
  })
  await app.assimilate()
  t.pass('reachable')

  await app.ready()
  t.pass('reachable')
})

test('await assimilate - promise resolves to instance', async (t) => {
  const app = {}
  boot(app)

  t.plan(4)

  app.use(async (f, opts, cb) => {
    app.use((f, opts, cb) => {
      t.pass('plugin init')
      cb()
    })
    const instance = await app.assimilate()
    t.is(instance, app)
  })
  t.pass('reachable')

  await app.ready()
  t.pass('reachable')
})

test('await assimilate - promise returning function plugins + promise chaining', async (t) => {
  const app = {}
  boot(app)

  t.plan(6)

  app.use((f, opts) => {
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
  await app.assimilate()
  t.pass('reachable')

  await app.ready()
  t.pass('reachable')
})

test('await assimilate - error handling, async throw', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  app.use(async (f, opts) => {
    throw Error('kaboom')
  })

  await app.assimilate()

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await assimilate - error handling, async throw, nested', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  app.use(async (f, opts) => {
    app.use(async (f, opts) => {
      throw Error('kaboom')
    })
  })
  await app.assimilate()

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await assimilate - error handling, same tick cb err', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  app.use((f, opts, cb) => {
    cb(Error('kaboom'))
  })
  await app.assimilate()
  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await assimilate - error handling, same tick cb err, nested', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  app.use((f, opts, cb) => {
    app.use((f, opts, cb) => {
      cb(Error('kaboom'))
    })
    cb()
  })
  await app.assimilate()
  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await assimilate - error handling, future tick cb err', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  app.use((f, opts, cb) => {
    setImmediate(() => { cb(Error('kaboom')) })
  })
  await app.assimilate()
  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await assimilate - error handling, future tick cb err, nested', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  app.use((f, opts, cb) => {
    app.use((f, opts, cb) => {
      setImmediate(() => { cb(Error('kaboom')) })
    })
    cb()
  })
  await app.assimilate()
  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await assimilate complex scenario', async (t) => {
  const app = {}
  boot(app)
  t.plan(16)

  let firstLoaded = false
  let secondLoaded = false
  let thirdLoaded = false
  let fourthLoaded = false

  app.use(first)
  await app.assimilate()
  t.ok(firstLoaded, 'first is loaded')
  t.notOk(secondLoaded, 'second is not loaded')
  t.notOk(thirdLoaded, 'third is not loaded')
  t.notOk(fourthLoaded, 'fourth is not loaded')
  app.use(second)
  t.ok(firstLoaded, 'first is loaded')
  t.notOk(secondLoaded, 'second is not loaded')
  t.notOk(thirdLoaded, 'third is not loaded')
  t.notOk(fourthLoaded, 'fourth is not loaded')
  app.use(third)
  await app.assimilate()
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
