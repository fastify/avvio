'use strict'

const avvio = require('.')()

avvio
  .use(first, { hello: 'world' })
  .use(duplicate, { count: 0 })
  .after((err, cb) => {
    if (err) {
      console.log('something bad happened')
      console.log(err)
    }
    console.log('after first and second')
    cb()
  })
  .use(duplicate, { count: 4 })
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

avvio.on('preReady', () => {
  console.log(avvio.prettyPrint())
})

function first (instance, opts, cb) {
  console.log('first loaded', opts)
  instance.use(second)
  setTimeout(cb, 42)
}

function second (instance, opts, cb) {
  console.log('second loaded')
  process.nextTick(cb)
}

function third (instance, opts, cb) {
  console.log('third loaded')
  cb()
}

function duplicate (instance, opts, cb) {
  console.log('duplicate loaded', opts.count)
  if (opts.count > 0) {
    instance.use(duplicate, { count: opts.count - 1 })
  }
  setTimeout(cb, 20)
}
