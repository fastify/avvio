const { test } = require('tap')
const { createError } = require('../lib/errors')

const expectedErrorName = 'AvvioError'

test('Create error with zero parameter', t => {
  t.plan(5)
  const NewError = createError('CODE', 'Not available')
  const err = new NewError()
  t.ok(err instanceof Error)
  t.ok(err.stack)
  t.equal(err.name, expectedErrorName)
  t.equal(err.message, 'Not available')
  t.equal(err.code, 'CODE')
})

test('Create error with 1 parameter', t => {
  t.plan(5)
  const NewError = createError('CODE', 'hey %s')
  const err = new NewError('alice')
  t.ok(err instanceof Error)
  t.ok(err.stack)
  t.equal(err.name, expectedErrorName)
  t.equal(err.message, 'hey alice')
  t.equal(err.code, 'CODE')
})

test('Create error with 2 parameters', t => {
  t.plan(5)
  const NewError = createError('CODE', 'hey %s, I like your %s')
  const err = new NewError('alice', 'attitude')
  t.ok(err instanceof Error)
  t.ok(err.stack)
  t.equal(err.name, expectedErrorName)
  t.equal(err.message, 'hey alice, I like your attitude')
  t.equal(err.code, 'CODE')
})

test('Create error with 3 parameters', t => {
  t.plan(5)
  const NewError = createError('CODE', 'hey %s, I like your %s %s')
  const err = new NewError('alice', 'attitude', 'see you')
  t.ok(err instanceof Error)
  t.ok(err.stack)
  t.equal(err.name, expectedErrorName)
  t.equal(err.message, 'hey alice, I like your attitude see you')
  t.equal(err.code, 'CODE')
})

test('Should throw when error code has no Avvio code', t => {
  t.plan(1)
  try {
    createError()
  } catch (err) {
    t.equal(err.message, 'Avvio error code must not be empty')
  }
})

test('Should throw when error code has no message', t => {
  t.plan(1)
  try {
    createError('code')
  } catch (err) {
    t.equal(err.message, 'Avvio base error message must not be empty')
  }
})

test('Create error with different base', t => {
  t.plan(6)
  const NewError = createError('CODE', 'hey %s', TypeError)
  const err = new NewError('dude')
  t.ok(err instanceof Error)
  t.ok(err instanceof TypeError)
  t.ok(err.stack)
  t.equal(err.name, expectedErrorName)
  t.equal(err.message, 'hey dude')
  t.equal(err.code, 'CODE')
})

test('AvvioError.toString returns code', t => {
  t.plan(1)
  const NewError = createError('CODE', 'foo')
  const err = new NewError()
  t.equal(err.toString(), 'AvvioError [CODE]: foo')
})

test('Create the error without the new keyword', t => {
  t.plan(5)
  const NewError = createError('CODE', 'Not available')
  const err = NewError()
  t.ok(err instanceof Error)
  t.ok(err.stack)
  t.equal(err.name, expectedErrorName)
  t.equal(err.message, 'Not available')
  t.equal(err.code, 'CODE')
})
