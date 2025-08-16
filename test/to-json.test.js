'use strict'

const { test } = require('node:test')
const boot = require('..')

function matchObject (t, actual, expected) {
  const isExpectedArray = Array.isArray(expected)
  const isExpectedRegex = expected instanceof RegExp

  if (typeof expected === 'object' && expected !== null && !isExpectedArray && !isExpectedRegex) {
    for (const key in expected) {
      if (!(key in actual)) {
        throw new Error(`Missing key: ${key}`)
      }
      matchObject(t, actual[key], expected[key])
    }
    return
  }

  if (isExpectedArray) {
    t.assert.ok(Array.isArray(actual))
    t.assert.strictEqual(actual.length, expected.length)
    for (let i = 0; i < expected.length; i++) {
      matchObject(t, actual[i], expected[i])
    }
    return
  }

  if (isExpectedRegex) {
    t.assert.match(actual.toString(), expected)
    return
  }

  t.assert.strictEqual(actual, expected)
}

test('to json', (t, end) => {
  t.plan(58)
  const app = boot()
  app
    .use(one)
    .use(two)
    .use(three)

  const outJson = {
    id: 'root',
    label: 'root',
    start: /\d+/,
    nodes: []
  }

  app.on('preReady', function show () {
    const json = app.toJSON()
    outJson.stop = /\d*/
    outJson.diff = /\d*/
    matchObject(t, json, outJson)
  })

  function one (s, opts, done) {
    const json = app.toJSON()
    outJson.nodes.push({
      id: /.+/,
      parent: outJson.label,
      label: 'one',
      start: /\d+/
    })
    matchObject(t, json, outJson)
    done()
  }
  function two (s, opts, done) {
    const json = app.toJSON()
    outJson.nodes.push({
      id: /.+/,
      parent: outJson.label,
      label: 'two',
      start: /\d+/
    })
    matchObject(t, json, outJson)
    done()
  }
  function three (s, opts, done) {
    const json = app.toJSON()
    outJson.nodes.push({
      id: /.+/,
      parent: outJson.label,
      label: 'three',
      start: /\d+/
    })
    matchObject(t, json, outJson)
    done()
    end()
  }
})

test('to json multi-level hierarchy', (t, done) => {
  t.plan(42)
  const server = { name: 'asd', count: 0 }
  const app = boot(server)

  const outJson = {
    id: 'root',
    label: 'root',
    start: /\d+/,
    nodes: [
      {
        id: /.+/,
        parent: 'root',
        start: /\d+/,
        label: 'first',
        nodes: [
          {
            id: /.+/,
            parent: 'first',
            start: /\d+/,
            label: 'second',
            nodes: [],
            stop: /\d+/,
            diff: /\d+/
          },
          {
            id: /.+/,
            parent: 'first',
            start: /\d+/,
            label: 'third',
            nodes: [
              {
                id: /.+/,
                parent: 'third',
                start: /\d+/,
                label: 'fourth',
                nodes: [],
                stop: /\d+/,
                diff: /\d+/
              }
            ],
            stop: /\d+/,
            diff: /\d+/
          }
        ],
        stop: /\d+/,
        diff: /\d+/
      }
    ],
    stop: /\d+/,
    diff: /\d+/
  }

  app.on('preReady', function show () {
    const json = app.toJSON()
    matchObject(t, json, outJson)
  })

  app.override = function (s) {
    const res = Object.create(s)
    res.count = res.count + 1
    res.name = 'qwe'
    return res
  }

  app.use(function first (s1, opts, cb) {
    s1.use(second)
    s1.use(third)
    cb()

    function second (s2, opts, cb) {
      t.assert.strictEqual(s2.count, 2)
      cb()
    }

    function third (s3, opts, cb) {
      s3.use(fourth)
      t.assert.strictEqual(s3.count, 2)
      cb()
    }

    function fourth (s4, opts, cb) {
      t.assert.strictEqual(s4.count, 3)
      cb()
      done()
    }
  })
})
