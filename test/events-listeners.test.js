'use strict'

const { test } = require('node:test')
const boot = require('..')
const noop = () => {}

test('boot a plugin and then execute a call after that', (t, testDone) => {
  t.plan(1)

  process.on('warning', (warning) => {
    t.assert.fail('we should not get a warning')
  })

  const app = boot()
  for (let i = 0; i < 12; i++) {
    app.on('preReady', noop)
  }

  setTimeout(() => {
    t.assert.ok('Everything ok')
    testDone()
  }, 500)
})

test('preReady error throws when there are no ready callbacks', async (t) => {
  const { spawn } = require('node:child_process')
  const path = require('node:path')

  const script = `
    const Avvio = require(${JSON.stringify(path.resolve(__dirname, '..'))})

    const app = Avvio({}, { autostart: false })

    app.once('preReady', () => {
      throw new Error('preReady failed')
    })

    app.start()
  `

  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['-e', script], {
      stdio: 'pipe'
    })

    let stderr = ''

    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('close', (code, signal) => {
      resolve({ code, signal, stderr })
    })
  })

  t.assert.notStrictEqual(result.code, 0)
  t.assert.match(result.stderr, /preReady failed/)
})
