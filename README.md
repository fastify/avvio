# boot-in-the-arse &nbsp;&nbsp;[![Build Status](https://travis-ci.org/mcollina/boot-in-the-arse.svg)](https://travis-ci.org/mcollina/boot-in-the-arse)

Asynchronous bootstrapping made easy. Wait for all components/plugins to start, and then start your whole app.

`boot-in-the-arse` is fully reentrant and graph-based. You can load
components/plugins _within_ plugins, and be still sure that things will
happen in the right order.

[![js-standard-style](https://raw.githubusercontent.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Example

```js
'use strict'

const boot = require('boot-in-the-arse')()

boot.use(first, { hello: 'world' })
boot.use(third, (err) => {
  if (err) {
    console.log('something bad happened')
    console.log(err)
  }

  console.log('third plugin loaded')
})

function first (instance, opts, cb) {
  console.log('first loaded', opts)
  instance.use(second, cb)
}

function second (instance, opts, cb) {
  console.log('second loaded')
  process.nextTick(cb)
}

function third (instance, opts, cb) {
  console.log('third loaded')
  cb()
}

boot.on('start', function () {
  console.log('application booted!')
})
```

## API

### boot([instance], [started])

Start a booting sequence. The `boot` function can be used also as a
constructor to inherits from.

`instance` will be used as the first
argument of all plugins loaded, you are responsible for exposing
`use()` if you pass this parameter, like:

```js
const server = {}
const boot = require('boot-in-the-arse')(server)
server.use = boot.use.bind(use)
```

Events:

* `'error'`  if something bad happens
* `'start'`  when the application starts

### app.use(func, [opts], [cb])

Loads a functions asynchronously. The function must have the
signature:

```js
function plugin (server, opts, done) {
  done()
}
```

Done must be called only once.

## License

MIT
