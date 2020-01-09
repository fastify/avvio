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

test('await use - promise resolves to instance', async (t) => {
  const app = {}
  boot(app)

  t.plan(4)

  app.use(async (f, opts, cb) => {
    const instance = await app.use((f, opts, cb) => {
      t.pass('plugin init')
      cb()
    })

    t.is(instance, app)
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

test('await use - error handling, async throw', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  await app.use(async (f, opts) => {
    throw Error('kaboom')
  })

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await use - error handling, async throw, nested', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  await app.use(async (f, opts) => {
    await app.use(async (f, opts) => {
      throw Error('kaboom')
    })
  })

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await use - error handling, same tick cb err', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  await app.use((f, opts, cb) => {
    cb(Error('kaboom'))
  })

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await use - error handling, same tick cb err, nested', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  await app.use((f, opts, cb) => {
    app.use((f, opts, cb) => {
      cb(Error('kaboom'))
    })
    cb()
  })

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await use - error handling, future tick cb err', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  await app.use((f, opts, cb) => {
    setImmediate(() => { cb(Error('kaboom')) })
  })

  t.rejects(() => app.ready(), Error('kaboom'))
})

test('await use - error handling, future tick cb err, nested', async (t) => {
  const app = {}
  boot(app)

  t.plan(1)

  await app.use((f, opts, cb) => {
    app.use((f, opts, cb) => {
      setImmediate(() => { cb(Error('kaboom')) })
    })
    cb()
  })

  t.rejects(() => app.ready(), Error('kaboom'))
})
