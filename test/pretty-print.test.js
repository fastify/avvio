'use strict'

const test = require('tap').test
const boot = require('..')

test('pretty print', t => {
  t.plan(14)

  const app = boot()
  app
    .use(first)
    .use(duplicate, { count: 3 })
    .use(second)
    .use(duplicate, { count: 2 })
    .use(third)
    .use(duplicate, { count: 1 })

  const linesExpected = [ /bound root \d+ ms/,
    /├── first \d+ ms/,
    /├─┬ duplicate \d+ ms/,
    /│ └─┬ duplicate \d+ ms/,
    /│ {3}└─┬ duplicate \d+ ms/,
    /│ {5}└── duplicate \d+ ms/,
    /├── second \d+ ms/,
    /├─┬ duplicate \d+ ms/,
    /│ └─┬ duplicate \d+ ms/,
    /│ {3}└── duplicate \d+ ms/,
    /├── third \d+ ms/,
    /└─┬ duplicate \d+ ms/,
    / {2}└── duplicate \d+ ms/,
    ''
  ]

  app.on('preReady', function show () {
    const print = app.prettyPrint()
    print.split('\n').forEach((l, i) => {
      t.match(l, linesExpected[i])
    })
  })

  function first (s, opts, done) {
    done()
  }
  function second (s, opts, done) {
    done()
  }
  function third (s, opts, done) {
    done()
  }

  function duplicate (instance, opts, cb) {
    if (opts.count > 0) {
      instance.use(duplicate, { count: opts.count - 1 })
    }
    setTimeout(cb, 20)
  }
})
