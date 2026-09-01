# avvio

[![CI](https://github.com/fastify/avvio/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fastify/avvio/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/avvio.svg?style=flat)](https://www.npmjs.com/package/avvio)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)

Asynchronous bootstrapping is hard, different things can go wrong, *error handling* and *load order* just to name a few. The module aims to make it simple.

`avvio` is fully *reentrant* and *graph-based*. You can load
components/plugins *within* plugins, and be still sure that things will
happen in the right order. At the end of the loading, your application will start.

- [Install](#install)
- [Example](#example)
- [How Avvio works](#how-avvio-works)
  - [The plugin tree](#the-plugin-tree)
  - [Load order](#load-order)
  - [The boot lifecycle](#the-boot-lifecycle)
  - [Using `use()`, `after()`, and `ready()`](#using-use-after-and-ready)
  - [Error handling](#error-handling)
  - [Shutdown](#shutdown)
- [API](#api)
- [Errors](#errors)
- [Acknowledgments](#acknowledgments)
- [License](#license)

## Install

To install `avvio`, simply use npm:

```sh
npm i avvio
```

TypeScript type definitions are bundled with the package (`index.d.ts`), so no extra `@types` package is needed.

To enable internal debug logging, run your application with the `NODE_DEBUG=avvio` environment variable set:

```sh
NODE_DEBUG=avvio node app.js
```

## Example

The example below demonstrates how to use `avvio` to load functions and plugins in order.

```js
'use strict'

const app = require('avvio')()

app
  .use(first, { hello: 'world' })
  .after((err, cb) => {
    if (err) {
      throw err
    }

    console.log('after first and second')
    cb()
  })

app.use(third)

app.ready(function (err) {
  
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

// async/await or Promise support
async function third (instance, opts) {
  console.log('third loaded')
}
```

The important part of this example is that `first` registers `second` while it is loading.

This creates the following plugin tree:

```text
root
├── first
│   └── second
└── third
```

The plugins are loaded in this order:

```text
first
second
third
```

Only after the required plugins have completed can the application become ready.

## How Avvio works

Avvio builds a tree of plugins and loads that tree in a predictable order.

The main concepts are:

- plugins can register other plugins;
- nested plugins become dependencies of their parent;
- plugins are loaded according to their position in the tree;
- `after()` waits for plugins registered before it;
- `ready()` waits for the complete boot process;
- errors stop the boot process until they are handled or propagated to `ready()`;
- `onClose()` and `close()` provide the shutdown lifecycle.

### The plugin tree

A call to `use()` adds a plugin to the current context.

A plugin can register additional plugins while it is loading. Those plugins become children of the current plugin.

For example:

```js
app.use(first)

app.use(third)

function first (instance, opts, done) {
  instance.use(second)
  done()
}
```

creates this tree:

```text
root
├── first
│   └── second
└── third
```

The nested `second` plugin belongs to `first`, because it was registered while `first` was loading.

This is what makes Avvio *reentrant*: a plugin can use the same application instance to register more plugins without losing the correct execution order.

### Load order

Avvio loads plugins according to their position in the plugin tree.

Given:

```js
app.use(first)

app.use(third)

function first (instance, opts, done) {
  instance.use(second)
  done()
}

function second (instance, opts, done) {
  done()
}

function third (instance, opts, done) {
  done()
}
```

the execution order is:

```text
first
second
third
```

`second` must finish before Avvio can continue with `third`, because `second` is a dependency of `first`.

This allows plugins to register the components they depend on without requiring the application to manually calculate the complete load order.

### The boot lifecycle

The boot process can be thought of as a sequence of phases:

```text
use()
  │
  │ register plugins
  ▼
plugin loading
  │
  │ nested plugins are loaded
  ▼
after()
  │
  │ wait for plugins registered so far
  ▼
ready()
  │
  │ wait for the complete boot process
  ▼
start
```

A plugin can register more plugins while it is loading:

```js
app.use(database)

function database (instance, opts, done) {
  instance.use(connectionPool)
  done()
}
```

Avvio waits for the nested plugin before considering the parent plugin complete.

### Using `use()`, `after()`, and `ready()`

The three methods have different purposes.

#### `use()`

Use `use()` to register a plugin:

```js
app.use(database)
app.use(routes)
```

A plugin can register additional plugins:

```js
function database (instance, opts, done) {
  instance.use(connectionPool)
  done()
}
```

#### `after()`

Use `after()` when you want to wait for all plugins registered before that point, including their dependencies:

```js
app.use(database)

app.after(function (err) {
  if (err) {
    throw err
  }

  // database and its dependencies are ready here
})
```

The application has not emitted the `start` event yet.

With async/await, `after()` can be awaited:

```js
app.use(database)

await app.after()

// database and its dependencies are ready here
```

#### `ready()`

Use `ready()` when you want to wait for the complete boot process:

```js
app.use(database)
app.use(routes)

await app.ready()

// the application is ready
```

`ready()` runs after all plugins and `after()` callbacks have completed, but before the `start` event is emitted.

A useful way to think about the difference is:

```text
use()
  Register work

after()
  Wait for work registered so far

ready()
  Wait for the complete boot process
```

### Error handling

Errors are part of the boot lifecycle.

If a plugin fails:

```js
app.use(function (instance, opts, done) {
  done(new Error('database failed'))
})
```

Avvio stops loading until the error is handled.

An `after()` callback can handle or propagate the error:

```js
app.after(function (err) {
  if (err) {
    throw err
  }

  // continue
})
```

If the error is not handled by an `after()` callback, it is propagated to `ready()`:

```js
app.ready(function (err) {
  if (err) {
    console.error(err)
    return
  }

  console.log('application booted')
})
```

The general flow is:

```text
plugin
  │
  ├── success ──────────────> continue
  │
  └── error
       │
       ▼
     after()
       │
       ├── handled ─────────> continue
       │
       └── not handled
              │
              ▼
            ready()
```

Plugins and callbacks can also fail by not completing within the configured `timeout`.

See [Errors](#errors) for the available error codes.

### Shutdown

Bootstrapping is only one part of an application's lifecycle. Avvio also provides a shutdown mechanism.

Use `onClose()` to register cleanup functions:

```js
app.onClose(async function () {
  await database.close()
})
```

Call `close()` to start the shutdown process:

```js
await app.close()
```

The registered `onClose()` callbacks are executed before the `close()` operation completes.

The lifecycle is therefore:

```text
boot
 │
 ▼
ready
 │
 ▼
application running
 │
 │ close()
 ▼
onClose()
 │
 ▼
closed
```

## API

- [avvio](#avvio)
  - [Install](#install)
  - [Example](#example)
  - [How Avvio works](#how-avvio-works)
    - [The plugin tree](#the-plugin-tree)
    - [Load order](#load-order)
    - [The boot lifecycle](#the-boot-lifecycle)
    - [Using `use()`, `after()`, and `ready()`](#using-use-after-and-ready)
      - [`use()`](#use)
      - [`after()`](#after)
      - [`ready()`](#ready)
    - [Error handling](#error-handling)
    - [Shutdown](#shutdown)
  - [API](#api)
    - [`avvio([instance], [options], [started])`](#avvioinstance-options-started)
      - [Options](#options)
        - [`expose`](#expose)
        - [`autostart`](#autostart)
        - [`timeout`](#timeout)
      - [Events](#events)
        - [`start`](#start)
        - [`preReady`](#preready)
        - [`close`](#close)
      - [Properties](#properties)
        - [`instance.started`](#instancestarted)
        - [`instance.booted`](#instancebooted)
      - [Constructor usage](#constructor-usage)
    - [`app.use(func, [optsOrFunc]) => Thenable`](#appusefunc-optsorfunc--thenable)
      - [Nested plugins](#nested-plugins)
      - [Awaiting `use()`](#awaiting-use)
      - [Dynamic options](#dynamic-options)
      - [ESM](#esm)
    - [Error handling](#error-handling-1)
    - [`app.after(func(error, [context], [done]))`](#appafterfuncerror-context-done)
      - [Callback signatures](#callback-signatures)
    - [`await app.after() | app.after() => Promise`](#await-appafter--appafter--promise)
    - [`app.ready([func(error, [context], [done])])`](#appreadyfuncerror-context-done)
      - [Callback signatures](#callback-signatures-1)
    - [`app.start()`](#appstart)
    - [`app.override(server, plugin, options)`](#appoverrideserver-plugin-options)
    - [`app.onClose(func([context], [done]))`](#apponclosefunccontext-done)
    - [`app.close(func(error, [context], [done]))`](#appclosefuncerror-context-done)
    - [`app[Symbol.asyncDispose]()`](#appsymbolasyncdispose)
    - [`avvio.toJSON()`](#avviotojson)
    - [`avvio.prettyPrint()`](#avvioprettyprint)
  - [Errors](#errors)
    - [Debugging timeouts](#debugging-timeouts)
  - [Acknowledgments](#acknowledgments)
  - [License](#license)

---

### `avvio([instance], [options], [started])`

Starts the Avvio boot sequence.

As the name suggests, `instance` is the object representing your application. Avvio adds the functions `use`, `after`, `ready`, `onClose`, and `close` to the instance.

```js
const server = {}

require('avvio')(server)

server
  .use(function first (s, opts, cb) {
    s.use(function second (s, opts, cb) {
      cb()
    })

    cb()
  })
  .after(function (err, cb) {
    if (err) {
      throw err
    }

    // first and second are finished
    cb()
  })
```

#### Options

##### `expose`

A key/value property to change how `use`, `after`, `ready`, `onClose`, and `close` are exposed on the instance.

This is useful when one of the default names is already taken.

```js
const server = {}

require('avvio')(server, {
  expose: {
    use: 'register',
    ready: 'onReady'
  }
})

server.register(function (s, opts, done) {
  done()
})

server.onReady(function (err) {
  if (err) {
    throw err
  }
})
```

##### `autostart`

When `autostart` is `false`, Avvio does not start loading plugins automatically. The boot sequence starts when `.start()` or `.ready()` is called.

```js
const app = require('avvio')({
  autostart: false
})

app.use(plugin)

// boot starts here
app.start()
```

##### `timeout`

The number of milliseconds to wait for a plugin or lifecycle callback to complete.

If the timeout is reached, Avvio emits:

- `AVV_ERR_PLUGIN_EXEC_TIMEOUT` for plugins;
- `AVV_ERR_READY_TIMEOUT` for `ready()` and `after()` callbacks.

The default is `0`, which disables the timeout.

See [Errors](#errors).

#### Events

##### `start`

Emitted when the application starts.

##### `preReady`

Emitted before the ready queue is run.

##### `close`

Emitted when the application has completed the shutdown procedure started with [`close()`](#appclosefuncerror-context-done).

#### Properties

##### `instance.started`

`true` once [`start()`](#appstart) has been called, or once [`ready()`](#appreadyfuncerror-context-done) starts the boot sequence when `autostart` is enabled.

It does not mean that loading has completed.

##### `instance.booted`

`true` once the root plugin and all of its dependencies have finished loading successfully.

#### Constructor usage

The `avvio` function can also be used as a constructor to inherit from.

```js
function Server () {}

const app = require('avvio')(new Server())

app.use(function (s, opts, done) {
  done()
})

app.on('start', () => {
  // your application can start
})
```

---

### `app.use(func, [optsOrFunc]) => Thenable`

Loads one or more functions asynchronously.

The function can use the following callback signature:

```js
function plugin (instance, options, done) {
  done()
}
```

`done` should be called only once, when the plugin is ready.

Additional calls to `done` are ignored.

If the plugin is ready immediately after the function is evaluated, `done` can be omitted:

```js
function plugin (instance, options) {
  // synchronous plugin
}
```

If the function returns a Promise, an async function can be used instead:

```js
async function plugin (instance, options) {
  await initialize()
}
```

#### Nested plugins

A plugin can register additional plugins:

```js
function first (instance, opts, done) {
  instance.use(second)
  done()
}

function second (instance, opts, done) {
  done()
}

app.use(first)
```

Avvio waits for `second` before considering `first` complete.

#### Awaiting `use()`

`use()` returns a thenable wrapped instance, so it can be awaited:

```js
async function main () {
  await app.use(async function (server, opts) {
    await sleep(10)
    console.log('this first')
  })

  console.log('then this')

  await app.ready()
  console.log('ready')
}

main().catch((err) => console.error(err))
```

#### Dynamic options

The options argument can also be a function.

The function receives the parent instance and returns the options for the plugin:

```js
function first (server, opts, done) {
  server.foo = 'bar'
  done()
}

function second (server, opts, done) {
  console.log(opts.foo === 'bar')
  done()
}

const options = parent => {
  return {
    foo: parent.foo
  }
}

app.use(first)
app.use(second, options)
```

This is useful when a value created by a plugin needs to be made available as options to another plugin.

#### ESM

ES modules can be loaded using a dynamic import:

```js
import boot from 'avvio'

const app = boot()

app.use(import('./fixtures/esm.mjs'))
```

---

### Error handling

To handle errors in plugins, use [`ready()`](#appreadyfuncerror-context-done):

```js
app.use(function (instance, opts, done) {
  done(new Error('error'))
})

app.ready(function (err) {
  if (err) {
    throw err
  }
})
```

When an error happens, plugin loading stops until the error is handled by an [`after()`](#appafterfuncerror-context-done) callback.

If it is not handled, the error is propagated to [`ready()`](#appreadyfuncerror-context-done).

---

### `app.after(func(error, [context], [done]))`

Calls a function after all previously defined plugins have loaded, including all their dependencies.

The `start` event has not been emitted yet.

`after()` can be used as a callback or awaited as a Promise.

#### Callback signatures

The callback signature changes based on the number of parameters it declares:

1. If no parameter is given, an error is passed to the next error handler.
2. If one parameter is given, it receives the `error`.
3. If two parameters are given, the first receives the `error` and the second is the `done` callback.
4. If three parameters are given, the first receives the `error`, the second receives the top-level `context`, and the third is the `done` callback.

In the zero- and one-parameter variants, the callback can return a Promise.

```js
const server = {}
const app = require('avvio')(server)

// one parameter
app.after(function (err) {
  if (err) {
    throw err
  }
})

// two parameters
app.after(function (err, done) {
  if (err) {
    throw err
  }

  done()
})

// three parameters
app.after(function (err, context, done) {
  if (err) {
    throw err
  }

  assert.equal(context, server)
  done()
})

// async
app.after(async function (err) {
  if (err) {
    throw err
  }

  await sleep(10)
})
```

`done` must be called only once.

When called with a function, `after()` returns the instance on which it was called, allowing chaining.

---

### `await app.after() | app.after() => Promise`

Calling `after()` without a function loads all plugins previously registered with `use()` and returns a Promise.

The Promise resolves when all plugins registered so far have loaded.

```js
async function main () {
  app.use(async function (server, opts) {
    await sleep(10)
    console.log('this first')
  })

  app.use(async function (server, opts) {
    await sleep(10)
    console.log('this second')
  })

  console.log('before after')

  await app.after()

  console.log('after after')

  app.use(async function (server, opts) {
    await sleep(10)
    console.log('this third')
  })

  await app.ready()

  console.log('ready')
}

main().catch((err) => console.error(err))
```

Unlike callback-based `after()` and `use()`, `await after` is not chainable.

---

### `app.ready([func(error, [context], [done])])`

Calls a function after all plugins and `after()` callbacks have completed, but before the `start` event is emitted.

`ready()` callbacks are executed one at a time.

#### Callback signatures

The callback signature changes based on the number of parameters it declares:

1. If no parameter is given, an error is passed to the next error handler.
2. If one parameter is given, it receives the `error`.
3. If two parameters are given, the first receives the `error` and the second is the `done` callback.
4. If three parameters are given, the first receives the `error`, the second receives the top-level `context`, and the third is the `done` callback.

When both `server` and `override` are specified, the context is the value returned by `override`.

```js
const server = {}
const app = require('avvio')(server)

// one parameter
app.ready(function (err) {
  if (err) {
    throw err
  }
})

// two parameters
app.ready(function (err, done) {
  if (err) {
    throw err
  }

  done()
})

// three parameters
app.ready(function (err, context, done) {
  if (err) {
    throw err
  }

  assert.equal(context, server)
  done()
})
```

If no callback is provided, `ready()` returns a Promise:

```js
app.ready()
  .then(() => console.log('Ready'))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
```

It can also be awaited:

```js
async function main () {
  try {
    await app.ready()
    console.log('Ready')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
```

`done` must be called only once.

The callback form of this function has no return value.

If `autostart: false` is passed as an option, calling `ready()` also starts the boot sequence.

---

### `app.start()`

Starts the boot sequence if it has not started yet.

Returns the `app` instance.

```js
const app = require('avvio')({
  autostart: false
})

app.use(plugin)

app.start()
```

---

### `app.override(server, plugin, options)`

Allows overriding the instance passed to each loading plugin.

It can be used to create an inheritance chain between server instances.

The first parameter is the server instance, the second is the plugin function, and the third is the options object passed to `use()`.

For example:

```js
const assert = require('node:assert')

const server = {
  count: 0
}

const app = require('avvio')(server)

app.override = function (s, fn, opts) {
  const res = Object.create(s)
  res.count = res.count + 1
  return res
}

app.use(function first (s1, opts, cb) {
  assert(s1 !== server)
  assert(Object.prototype.isPrototypeOf.call(server, s1))
  assert(s1.count === 1)

  s1.use(second)
  cb()

  function second (s2, opts, cb) {
    assert(s2 !== s1)
    assert(Object.prototype.isPrototypeOf.call(s1, s2))
    assert(s2.count === 2)
    cb()
  }
})
```

The resulting relationship is:

```text
server
  │
  ▼
instance for first
  │
  ▼
instance for second
```

Each child instance inherits from its parent.

---

### `app.onClose(func([context], [done]))`

Registers a callback that is executed when the [`close()`](#appclosefuncerror-context-done) API is called.

The callback can use one of the following signatures:

1. One parameter: receives the `context`.
2. Zero or one parameter: may return a Promise.
3. Two parameters: receives the `context` and `done` callback.

```js
const server = {}
const app = require('avvio')(server)

// one parameter
app.onClose(function (context) {
  // ...
})

// Promise
app.onClose(function (context) {
  return new Promise((resolve, reject) => {
    // ...
  })
})

// async
app.onClose(async function (context) {
  await cleanup()
})

// callback
app.onClose(function (context, done) {
  // ...
  done()
})
```

If the callback returns a Promise, the next `onClose()` callback and the `close()` callback wait until the Promise resolves or rejects.

`done` must be called only once.

Returns the instance on which `onClose()` was called, allowing chaining.

---

### `app.close(func(error, [context], [done]))`

Starts the shutdown procedure.

The callback is called once all registered `onClose()` callbacks have completed.

The callback can use one of the following signatures:

1. One parameter: receives the `error`.
2. Two parameters: receives the `error` and `done` callback.
3. Three parameters: receives the `error`, `context`, and `done` callback.

```js
const server = {}
const app = require('avvio')(server)

// one parameter
app.close(function (err) {
  if (err) {
    throw err
  }
})

// two parameters
app.close(function (err, done) {
  if (err) {
    throw err
  }

  done()
})

// three parameters
app.close(function (err, context, done) {
  if (err) {
    throw err
  }

  assert.equal(context, server)
  done()
})
```

When no callback is provided, `close()` returns a Promise:

```js
app.close()
  .then(() => console.log('Closed'))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
```

`done` must be called only once.

---

### `app[Symbol.asyncDispose]()`

This method is an alias for [`app.close()`](#appclosefuncerror-context-done) and supports ECMAScript Explicit Resource Management.

It allows the use of `await using` to automatically close the Avvio instance when it goes out of scope.

This is especially useful in unit tests and short-lived processes where resources need to be cleaned up automatically.

```js
test('my test', async () => {
  await using app = avvio()

  app.use(function (server, opts, done) {
    done()
  })

  await app.ready()

  // app.close() is called automatically
})
```

This feature requires Node.js 20 or later.

---

### `avvio.toJSON()`

Returns a JSON tree representing the state of the plugins and their loading times.

Call it on `preReady` to get the complete tree.

```js
const app = require('avvio')()

app.on('preReady', () => {
  console.log(app.toJSON())
})
```

The output is similar to:

```json
{
  "label": "root",
  "start": 1550245184665,
  "nodes": [
    {
      "parent": "root",
      "start": 1550245184665,
      "label": "first",
      "nodes": [
        {
          "parent": "first",
          "start": 1550245184708,
          "label": "second",
          "nodes": [],
          "stop": 1550245184709,
          "diff": 1
        }
      ],
      "stop": 1550245184709,
      "diff": 44
    }
  ],
  "stop": 1550245184709,
  "diff": 44
}
```

---

### `avvio.prettyPrint()`

Returns a printable representation of the tree returned by `toJSON()`.

```js
const app = require('avvio')()

app.on('preReady', () => {
  console.log(app.prettyPrint())
})
```

Example output:

```text
avvio 56 ms
├── first 52 ms
├── second 1 ms
└── third 2 ms
```

---

## Errors

`avvio` uses [`@fastify/error`](https://github.com/fastify/fastify-error) to generate its errors.

Every error exposes a stable `code` and `message`.

| Code | Message | Notes |
| --- | --- | --- |
| `AVV_ERR_EXPOSE_ALREADY_DEFINED` | `'%s' is already defined, specify an expose option for '%s'` | Thrown when a property that Avvio needs to expose on the instance (`use`, `after`, `ready`, `onClose`, `close`) is already taken. Use the `expose` option to rename it. |
| `AVV_ERR_ATTRIBUTE_ALREADY_DEFINED` | `'%s' is already defined` | Thrown when the instance already has a `then` property, which Avvio needs to make itself awaitable. |
| `AVV_ERR_CALLBACK_NOT_FN` | `Callback for '%s' hook is not a function. Received: '%s'` | Thrown when a non-function value is passed where a callback (`ready`, `close`, `onClose`, etc.) is expected. |
| `AVV_ERR_PLUGIN_NOT_VALID` | `Plugin must be a function or a promise. Received: '%s'` | Thrown when the value passed to `use()` is neither a function nor a thenable. |
| `AVV_ERR_ROOT_PLG_BOOTED` | `Root plugin has already booted` | Thrown when calling `use()` after the instance has already booted. |
| `AVV_ERR_PARENT_PLG_LOADED` | `Impossible to load '%s' plugin because the parent '%s' was already loaded` | Thrown when trying to register a plugin on a parent that has already finished loading. |
| `AVV_ERR_READY_TIMEOUT` | `Plugin did not start in time: '%s'. You may have forgotten to call 'done' function or to resolve a Promise` | Thrown when a `ready()` or `after()` callback does not complete before the configured `timeout` elapses. |
| `AVV_ERR_PLUGIN_EXEC_TIMEOUT` | `Plugin did not start in time: '%s'. You may have forgotten to call 'done' function or to resolve a Promise` | Thrown when a plugin passed to `use()` does not complete before the configured `timeout` elapses. |

The plugin or callback name used in `'%s'` is derived from the function name, an explicit `name` option, or, for [`fastify-plugin`](https://github.com/fastify/fastify-plugin)-wrapped plugins, the metadata attached to the plugin.

This is also the name shown by [`prettyPrint()`](#avvioprettyprint) and [`toJSON()`](#avviotojson).

### Debugging timeouts

When a timeout occurs, the error message includes the name of the plugin or callback that did not complete.

If a plugin uses the callback API, make sure `done()` is called:

```js
app.use(function plugin (instance, opts, done) {
  initializeSomething()
  done()
})
```

If a plugin uses async/await, make sure its Promise resolves:

```js
app.use(async function plugin (instance, opts) {
  await initializeSomething()
})
```

## Acknowledgments

This project was kindly sponsored by [nearForm](https://nearform.com/).

## License

Copyright Matteo Collina 2016-2020, Licensed under [MIT](LICENSE).
