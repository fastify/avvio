'use strict'

const t = require('tap')
const express = require('express')
const http = require('http')
const boot = require('..')

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

app.load(function (app, opts, done) {
  loaded = true
  app.use(function (req, res) {
    res.end('hello world')
  })

  done()
})

app.after((cb) => {
  t.ok(loaded, 'plugin loaded')
  const server = app.listen(3000, cb)
  t.teardown(server.close.bind(server))
})

app.ready(() => {
  http.get('http://localhost:3000').on('response', function (res) {
    let data = ''
    res.on('data', function (chunk) {
      data += chunk
    })

    res.on('end', function () {
      t.equal(data, 'hello world')
    })
  })
})
