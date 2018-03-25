# avvio

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
 [![Build Status](https://travis-ci.org/mcollina/avvio.svg)](https://travis-ci.org/mcollina/avvio)

Asynchronous bootstrapping is hard, different things can go wrong, *error handling* and *load order* just to name a few. The aim of this module is to made it simple.

`avvio` is fully *reentrant* and *graph-based*. You can load
components/plugins *within* plugins, and be still sure that things will
happen in the right order. At the end of the loading, your application will start.

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

The example below can be found [here][example] and ran using `node example.js`.
It demonstrates how to use `avvio` to load functions / plugins in order.


```js
'use strict'

const app = require('avvio')()

app
  .use(first, { hello: 'world' })
  .after((err, cb) => {
    console.log('after first and second')
    cb()
  })

app.use(third)

app.ready(function () {
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

// async/await or Promise support
async function third (instance, opts) {
  console.log('third loaded')
}
```

<a name="api"></a>
## API

  * <a href="#constructor"><code><b>avvio()</b></code></a>
  * <a href="#use"><code>instance.<b>use()</b></code></a>
  * <a href="#after"><code>instance.<b>after()</b></code></a>
  * <a href="#ready"><code>instance.<b>ready()</b></code></a>
  * <a href="#start"><code>instance.<b>start()</b></code></a>
  * <a href="#override"><code>instance.<b>override()</b></code></a>
  * <a href="#onClose"><code>instance.<b>onClose()</b></code></a>
  * <a href="#close"><code>instance.<b>close()</b></code></a>
  * <a href="#express"><code>avvio.<b>express()</b></code></a>

-------------------------------------------------------
<a name="constructor"></a>

### avvio([instance], [options], [started])

Starts the avvio sequence.
As the name suggest, `instance` is the object representing your application.
Avvio will add the functions `use`, `after` and `ready` to the instance.

```js
const server = {}

require('avvio')(server)

server.use(function first (s, opts, cb) {
  // s is the same of server
  s.use(function second (s, opts, cb) {
    cb()
  })
  cb()
}).after(function (err, cb) {
  // after first and second are finished
  cb()
})
```

Options:

* `expose`: a key/value property to change how `use`, `after` and `ready` are exposed.
* `autostart`: do not start loading plugins automatically, but wait for
  a call to [`.start()`](#start)  or [`.ready()`](#ready).


Events:

* `'start'`  when the application starts
* `'preReady'` fired before the ready queue is run

The `avvio` function can be used also as a
constructor to inherits from.
```js
function Server () {}
const app = require('avvio')(new Server())

app.use(function (s, opts, done) {
  // your code
  done()
})

app.on('start', () => {
  // you app can start
})
```

-------------------------------------------------------
<a name="use"></a>

### app.use(func, [opts])

Loads one or more functions asynchronously.
The function **must** have the signature: `instance, options, done`

Plugin example:
```js
function plugin (server, opts, done) {
  done()
}

app.use(plugin)
```
`done` must be called only once, when your plugin is ready to go.

async/await is also supported:

```js
async function plugin (server, opts) {
  await sleep(10)
}
app.use(plugin)
```

`use` returns the instance on which `use` is called, to support a chainable API.

<a name="error-handling"></a>
#### Error handling

In order to handle errors in the loading plugins, you must use the
`.ready()` method, like so:

```js
app.use(function (instance, opts, done) {
  done(new Error('error'))
}, opts)

app.ready(function (err) {
  if (err) throw err
})
```

When an error happens, the loading of plugins will stop until there is
an [`after`](#after) callback specified. Otherwise, it will be handled
in [`ready`](#ready).

-------------------------------------------------------
<a name="after"></a>

### app.after(func(error, [context], [done]))

Calls a function after all the previously defined plugins are loaded, including
all their dependencies. The `'start'` event is not emitted yet.

The callback changes basing on the parameters your are giving:
1. If no parameter is given to the callback and there is an error, that error will be passed to the next error handler.
2. If one parameter is given to the callback, that parameter will be the `error` object.
3. If two parameters are given to the callback, the first will be the `error` object, the second will be the `done` callback.
4. If three parameters are given to the callback, the first will be the `error` object, the second will be the top level `context` unless you have specified both server and override, in that case the `context` will be what the override returns, and the third the `done` callback.

In the "no parameter" and "one parameter" variants, the callback can also
return a `Promise`.

```js
const server = {}
const app = require('avvio')(server)

...
// after with one parameter
app.after(function (err) {
  if (err) throw err
})

// after with two parameter
app.after(function (err, done) {
  if (err) throw err
  done()
})

// after with three parameters
app.after(function (err, context, done) {
  if (err) throw err
  assert.equal(context, server)
  done()
})

// async after with one parameter
app.after(async function (err) {
  await sleep(10)
  if (err) {
    throw err
  }
})

// async after with no parameter
app.after(async function () {
  await sleep(10)
})
```

`done` must be called only once.

Returns the instance on which `after` is called, to support a chainable API.

-------------------------------------------------------
<a name="ready"></a>

### app.ready([func(error, [context], [done])])

Calls a function after all the plugins and `after` call are completed, but before `'start'` is emitted. `ready` callbacks are executed one at a time.

The callback changes basing on the parameters your are giving:
1. If no parameter is given to the callback and there is an error, that error will be passed to the next error handler.
2. If one parameter is given to the callback, that parameter will be the `error` object.
3. If two parameters are given to the callback, the first will be the `error` object, the second will be the `done` callback.
4. If three parameters are given to the callback, the first will be the `error` object, the second will be the top level `context` unless you have specified both server and override, in that case the `context` will be what the override returns, and the third the `done` callback.

If no callback is provided `ready` will return a Promise that is resolved or rejected once plugins and `after` calls are completed.  On success `context` is provided to the `.then` callback, if an error occurs it is provided to the `.catch` callback.

```js
const server = {}
const app = require('avvio')(server)
...
// ready with one parameter
app.ready(function (err) {
  if (err) throw err
})

// ready with two parameter
app.ready(function (err, done) {
  if (err) throw err
  done()
})

// ready with three parameters
app.ready(function (err, context, done) {
  if (err) throw err
  assert.equal(context, server)
  done()
})

// ready with Promise
app.ready()
  .then(() => console.log('Ready'))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })

// await ready from an async function.
async function main () [
  try {
    await app.ready()
    console.log('Ready')
  } catch(err) {
    console.error(err)
    process.exit(1)
  }
}
```

`done` must be called only once.

The callback form of this function has no return value.

If `autostart: false` is passed as an option, calling `.ready()`  will
also start the boot sequence.

-------------------------------------------------------
<a name="start"></a>

### app.start()

Start the boot sequence, if it was not started yet.
Returns the `app` instance.

-------------------------------------------------------
<a name="express"></a>

### avvio.express(app)

Same as:

```js
const app = express()
const avvio = require('avvio')

avvio(app, {
  expose: {
    use: 'load'
  }
})
```

-------------------------------------------------------
<a name="override"></a>

### app.override(server, plugin, options)

Allows to override the instance of the server for each loading plugin.
It allows the creation of an inheritance chain for the server instances.
The first parameter is the server instance and the second is the plugin function while the third is the options object that you give to use.

```js
const assert = require('assert')
const server = { count: 0 }
const app = require('avvio')(server)

console.log(app !== server, 'override must be set on the Avvio instance')

app.override = function (s, fn, opts) {
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
  s1.use(second)
  cb()

  function second (s2, opts, cb) {
    assert(s2 !== s1)
    assert(s1.isPrototypeOf(s2))
    assert(s2.count === 2)
    cb()
  }
})
```
-------------------------------------------------------

<a name="onClose"></a>
### app.onClose(func([context], [done]))

Registers a new callback that will be fired once then `close` api is called.

The callback changes basing on the parameters your are giving:
1. If one parameter is given to the callback, that parameter will be the `context`.
2. If two parameters are given to the callback, the first will be the top level `context` unless you have specified both server and override, in that case the `context` will be what the override returns, the second will be the `done` callback.

```js
const server = {}
const app = require('avvio')(server)
...
// onClose with one parameter
app.onClose(function (context) {
  // ...
})

// onClose with two parameter
app.onClose(function (context, done) {
  // ...
  done()
})
```

`done` must be called only once.
Returns the instance on which `onClose` is called, to support a chainable API.

-------------------------------------------------------

<a name="close"></a>
### app.close(func(error, [context], [done]))

Starts the shutdown procedure, the callback is called once all the registered callbacks with `onClose` has been executed.

The callback changes basing on the parameters your are giving:
1. If one parameter is given to the callback, that parameter will be the `error` object.
2. If two parameters are given to the callback, the first will be the `error` object, the second will be the `done` callback.
3. If three parameters are given to the callback, the first will be the `error` object, the second will be the top level `context` unless you have specified both server and override, in that case the `context` will be what the override returns, and the third the `done` callback.

```js
const server = {}
const app = require('avvio')(server)
...
// close with one parameter
app.close(function (err) {
  if (err) throw err
})

// close with two parameter
app.close(function (err, done) {
  if (err) throw err
  done()
})

// close with three parameters
app.close(function (err, context, done) {
  if (err) throw err
  assert.equal(context, server)
  done()
})
```

`done` must be called only once.

-------------------------------------------------------

## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

## License

Copyright Matteo Collina 2016-2017, Licensed under [MIT][].

[MIT]: ./LICENSE
[example]: ./example.js
