'use strict'
const archy = require('archy')

function TimeTree () {
  this.timeTable = {}
}

TimeTree.prototype.get = function (parent = 'boot', child) {
  const p = this.timeTable[parent]
  if (p) {
    return p.children.find(_ => _.label === child)
  }
  return undefined
}

TimeTree.prototype.add = function (parent = 'boot', track) {
  let p = this.timeTable[parent]
  if (!p) {
    this.timeTable[parent] = {
      children: [],
      label: parent
    }
    p = this.timeTable[parent]
  }

  if (!this.get(parent, track)) {
    p.children.push({ label: track })
  }
}

TimeTree.prototype.start = function (parent, track, start) {
  const tm = this.get(parent, track)
  if (!tm) {
    this.add(parent, track)
  }

  this.get(parent, track).start = start || Date.now()
}

TimeTree.prototype.stop = function (parent, track, stop) {
  const tm = this.get(parent, track)
  if (tm) {
    tm.stop = stop || Date.now()
    tm.diff = (tm.stop - tm.start) || 0
  }
}

TimeTree.prototype.prittyPrint = function () {
  const analyzePlugin = (node) => {
    let nodes = []
    if (node.children && node.children.length > 0) {
      nodes = node.children.map(_ => analyzePlugin(_))
    }
    return {
      label: `${node.label} ${node.diff} ms`,
      nodes
    }
  }

  const plugins = Object.keys(this.timeTable).map(_ => analyzePlugin(this.timeTable[_]))
  const out = {
    label: 'avvio',
    nodes: plugins
  }
  console.log(archy(out))
}

module.exports = TimeTree
