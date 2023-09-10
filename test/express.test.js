'use strict'

const { test } = require('tap')
const express = require('express')
const http = require('node:http')
const boot = require('..')

test('express support', (t) => {
  const app = express()

  boot.express(app)
  // It does:
  //
  // boot(app, {
  //   expose: {
  //     use: 'load'
  //   }
  // })

  t.plan(2)

  let loaded = false
  let server

  app.load(function (app, opts, done) {
    loaded = true
    app.use(function (req, res) {
      res.end('hello world')
    })

    done()
  })

  app.after((cb) => {
    t.ok(loaded, 'plugin loaded')
    server = app.listen(0, cb)
    t.teardown(server.close.bind(server))
  })

  app.ready(() => {
    http.get(`http://localhost:${server.address().port}`).on('response', function (res) {
      let data = ''
      res.on('data', function (chunk) {
        data += chunk
      })

      res.on('end', function () {
        t.equal(data, 'hello world')
      })
    })
  })
})
