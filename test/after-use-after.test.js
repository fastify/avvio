'use strict'

const t = require('tap')
const boot = require('..')
const app = {}

boot(app)

t.plan(6)

app.use(function (f, opts, cb) {
  cb()
}).after(() => {
  t.pass('this is just called')

  app.use(function (f, opts, cb) {
    t.pass('this is just called')
    cb()
  })
}).after(function () {
  t.pass('this is just called')
  app.use(function (f, opts, cb) {
    t.pass('this is just called')
    cb()
  })
}).after(function (err, cb) {
  t.pass('this is just called')
  cb(err)
})

app.ready().then(() => {
  t.pass('ready')
}).catch(() => {
  t.fail('this should not be called')
})
