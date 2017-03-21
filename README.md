# avvio &nbsp;&nbsp;[![Build Status](https://travis-ci.org/mcollina/avvio.svg)](https://travis-ci.org/mcollina/avvio)

Asynchronous bootstrapping made easy. Wait for all components/plugins to start, and then start your whole app.

`avvio` is fully reentrant and graph-based. You can load
components/plugins _within_ plugins, and be still sure that things will
happen in the right order.

[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

* [Install](#install)
* [Example](#example)
* [API](#api)
* [Acknowledgements](#acknowledgements)
* [License](#license)

<a name="install"></a>
## Install

To install `avvio`, simply use npm:

```
npm install avvio --save
```

<a name="example"></a>
## Example

The example below can be found [here][example] and ran using `node example.js`. It
demonstrates how to use `avvio` to load functions /
plugins in
order.


```js
'use strict'

const boot = require('avvio')()

boot
  .use(first, { hello: 'world' })
  .after((cb) => {
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
  .ready(function () {
    console.log('application booted!')
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
```

<a name="api"></a>
## API

  * <a href="#constructor"><code><b>boot()</b></code></a>
  * <a href="#use"><code>instance.<b>use()</b></code></a>
  * <a href="#after"><code>instance.<b>after()</b></code></a>
  * <a href="#ready"><code>instance.<b>ready()</b></code></a>
  * <a href="#override"><code>instance.<b>override()</b></code></a>
  * <a href="#express"><code>boot.<b>express()</b></code></a>

-------------------------------------------------------
<a name="constructor"></a>

### boot([instance], [started])

Start a boot sequence.

`instance` will be used as the first
argument of all plugins loaded and `use`, `after` and `ready` 
function will be
added to that object, keeping the support for the chainable API:

```js
const server = {}

require('avvio')(server)

server.use(function first (s, opts, cb) {
  // s is the same of server
  s.use(function second (s, opts, cb) {
    cb()
  }, cb)
}).after(function (cb) {
  // after first and second are finished
  cb()
})
```

Options:

* `expose`: a key/value property to change how `use`, `after` and `ready` are exposed.

Events:

* `'error'`  if something bad happens
* `'start'`  when the application starts

The `boot` function can be used also as a
constructor to inherits from.

-------------------------------------------------------
<a name="use"></a>

### app.use(func, [opts], [cb])

Loads a functions asynchronously. The function must have the
signature:

```js
function plugin (server, opts, done) {
  done()
}
```
`done` must be called only once.

Returns the instance on which `use` is called, to support a
chainable API.

If you need to add more than a function and you don't need to use a different options object or callback, you can pass an array of functions to `.use`.
```js
boot.use([first, second, third], opts, cb)
```
The functions will be loaded in the same order as they are inside the array.

-------------------------------------------------------
<a name="after"></a>

### app.after(func([context], [done]), [cb])

Calls a function after all the previously defined plugins are loaded, including
all their dependencies. The `'start'` event is not emitted yet.  
If one parameter is given to the callback, that parameter will be the `done` callback.  
If two parameters are given to the callback, the first will be the `contenxt`, the second will be the `done` callback.

```js
const server = {}
...
// after with one parameter
boot.after(function (done) {
  done()
})

// after with two parameters
boot.after(function (context, done) {
  assert.equal(context, server)
  done()
})
```

`done` must be called only once.

Returns the instance on which `after` is called, to support a
chainable API.

-------------------------------------------------------
<a name="ready"></a>

### app.ready(func([context], [done]))

Calls a functon after all the plugins and `after` call are
completed, but befer `'start'` is emitted. `ready` callbacks are
executed one at a time.  
If one parameter is given to the callback, that parameter will be the `done` callback.  
If two parameters are given to the callback, the first will be the `contenxt`, the second will be the `done` callback.
```js
const server = {}
...
// ready with one parameter
boot.ready(function (done) {
  done()
})

// ready with two parameters
boot.ready(function (context, done) {
  assert.equal(context, server)
  done()
})
```

`done` must be called only once.

Returns the instance on which `ready` is called, to support a
chainable API.

-------------------------------------------------------
<a name="express"></a>

### boot.express(app)

Same as:

```js
const app = express()

boot(app, {
  expose: {
    use: 'load'
  }
})
```

-------------------------------------------------------
<a name="override"></a>

### app.override(server, plugin)

Allows to override the instance of the server for each loading
plugin. It allows the creation of an inheritance chain for the
server instances.  
The first parameter is the server instance and the second is the plugin function.

```js
const boot = require('avvio')
const assert = require('assert')
const server = { count: 0 }
const app = boot(server)

console.log(app !== server, 'override must be set on the Avvio instance')

app.override = function (s, fn) {
  // create a new instance with the
  // server as the prototype
  const res = Object.create(s)
  res.count = res.count + 1

  return res
}

app.use(function first (s1, opts, cb) {
  assert(s1 !== server)
  assert(server.isPrototypeOf(s1))
  assert(s1.count === 1)
  s1.use(second, cb)

  function second (s2, opts, cb) {
    assert(s2 !== s1)
    assert(s1.isPrototypeOf(s2))
    assert(s2.count === 2)
    cb()
  }
})
```
-------------------------------------------------------

## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

## License

Copyright Matteo Collina 2016, Licensed under [MIT][].

[MIT]: ./LICENSE
[example]: ./example.js
