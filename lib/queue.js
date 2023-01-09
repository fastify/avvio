'use strict'

const FastQ = require('fastq')
const { noop } = require('./noop')

/**
 * Initialize a paused queue with context
 * @param {*} context
 * @param {*} worker
 * @param {*} drain
 */
function createQueue (context, worker, drain) {
  const q = FastQ(context, worker, 1)
  q.pause()
  q.drain = drain ?? noop
  return q
}

module.exports = {
  createQueue
}
