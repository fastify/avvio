'use strict'

const test = require('tap').test
const boot = require('..')

test('to json', (t) => {
  t.plan(4)

  const app = boot()
  app
    .use(one)
    .use(two)
    .use(three)

  const outJson = {
    avvio: {
      label: 'avvio',
      start: /\d*/,
      stop: /\d*/,
      diff: /\d*/,
      children: []
    }
  }

  app.on('preReady', function show () {
    const json = app.toJSON()
    t.like(json, outJson)
  })

  function one (s, opts, done) {
    const json = app.toJSON()
    outJson.avvio.children.push({
      label: 'one',
      start: /\d*/,
      stop: /\d*/,
      diff: /\d*/
    })
    t.like(json, outJson)
    done()
  }
  function two (s, opts, done) {
    const json = app.toJSON()
    outJson.avvio.children.push({
      label: 'two',
      start: /\d*/,
      stop: /\d*/,
      diff: /\d*/
    })
    t.like(json, outJson)
    done()
  }
  function three (s, opts, done) {
    const json = app.toJSON()
    outJson.avvio.children.push({
      label: 'three',
      start: /\d*/,
      stop: /\d*/,
      diff: /\d*/
    })
    t.like(json, outJson)
    done()
  }
})
