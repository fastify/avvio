'use strict'

const avvio = require('.')()

avvio
  .use(first, { hello: 'world' })
  .after((err, cb) => {
    if (err) {
      console.log('something bad happened')
      console.log(err)
    }
    console.log('after first and second')
    cb()
  })
  .use(third, (err) => {
    if (err) {
      console.log('something bad happened')
      console.log(err)
    }

    console.log('third plugin loaded')
  })
  .ready(function (err) {
    if (err) {
      throw err
    }
    console.log('application booted!')
  })

function first (instance, opts, cb) {
  console.log('first loaded', opts)
  instance.use(second)
  cb()
}

function second (instance, opts, cb) {
  console.log('second loaded')
  process.nextTick(cb)
}

function third (instance, opts, cb) {
  console.log('third loaded')
  cb()
}
