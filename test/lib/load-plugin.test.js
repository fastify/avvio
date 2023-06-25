'use strict'

const { test } = require('tap')
const boot = require('../..')
const { loadPlugin } = require('../../lib/load-plugin')
const { Plugin } = require('../../plugin')

test('successfully load a plugin with sync function', (t) => {
  t.plan(1)
  const app = boot({})

  const plugin = new Plugin(app, function (instance, opts, done) {
    done()
  }, false, 0)

  loadPlugin(app, plugin, function (err) {
    t.equal(err, undefined)
  })
})

test('catch an error when loading a plugin with sync function', (t) => {
  t.plan(1)
  const app = boot({})

  const plugin = new Plugin(app, function (instance, opts, done) {
    done(Error('ArbitraryError'))
  }, false, 0)

  loadPlugin(app, plugin, function (err) {
    t.equal(err.message, 'ArbitraryError')
  })
})

test('successfully load a plugin with async function', (t) => {
  t.plan(1)
  const app = boot({})

  const plugin = new Plugin(app, async function (instance, opts) { }, false, 0)

  loadPlugin(app, plugin, function (err) {
    t.equal(err, undefined)
  })
})

test('catch an error when loading a plugin with async function', (t) => {
  t.plan(1)
  const app = boot({})

  const plugin = new Plugin(app, async function (instance, opts) {
    throw Error('ArbitraryError')
  }, false, 0)

  loadPlugin(app, plugin, function (err) {
    t.equal(err.message, 'ArbitraryError')
  })
})

test('successfully load a plugin when function is a Promise, which resolves to a function', (t) => {
  t.plan(1)
  const app = boot({})

  const plugin = new Plugin(app, new Promise(resolve => resolve(function (instance, opts, done) {
    done()
  })), false, 0)

  loadPlugin(app, plugin, function (err) {
    t.equal(err, undefined)
  })
})

test('catch an error when loading a plugin when function is a Promise, which resolves to a function', (t) => {
  t.plan(1)
  const app = boot({})

  const plugin = new Plugin(app, new Promise(resolve => resolve(function (instance, opts, done) {
    done(Error('ArbitraryError'))
  })), false, 0)

  loadPlugin(app, plugin, function (err) {
    t.equal(err.message, 'ArbitraryError')
  })
})

test('successfully load a plugin when function is a Promise, which resolves to a function, which is wrapped in default', (t) => {
  t.plan(1)
  const app = boot({})

  const plugin = new Plugin(app, new Promise(resolve => resolve({
    default: function (instance, opts, done) {
      done()
    }
  })), false, 0)

  loadPlugin(app, plugin, function (err) {
    t.equal(err, undefined)
  })
})

test('catch an error when loading a plugin when function is a Promise, which resolves to a function, which is wrapped in default', (t) => {
  t.plan(1)
  const app = boot({})

  const plugin = new Plugin(app, new Promise(resolve => resolve({
    default: function (instance, opts, done) {
      done(Error('ArbitraryError'))
    }
  })), false, 0)

  loadPlugin(app, plugin, function (err) {
    t.equal(err.message, 'ArbitraryError')
  })
})
