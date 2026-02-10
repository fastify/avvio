'use strict'

module.exports = require('neostandard')({
  ignores: [
    ...require('neostandard').resolveIgnoresFromGitignore(),
    // ESLint parser doesn't support 'await using' syntax yet (ES2024 Explicit Resource Management)
    'test/symbol-async-dispose.test.js'
  ],
  ts: true
})
