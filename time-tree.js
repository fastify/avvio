'use strict'
const archy = require('archy')

function TimeTree () {
  this.root = null
}

TimeTree.prototype.get = function (parent) {
  if (parent === null) {
    return this.root
  }

  const seachNode = (node, name) => {
    const isMe = node.label === name
    if (!isMe) {
      return node.nodes
        .map(_ => seachNode(_, name))
        .filter(_ => _ !== null)
        .pop()
    }
    return node
  }
  return seachNode(this.root, parent)
}

TimeTree.prototype.add = function (parent, child, start) {
  const isRoot = parent === null
  if (isRoot) {
    this.root = {
      label: child,
      start,
      nodes: []
    }
    return
  }

  const node = this.get(parent)
  node.nodes.push({
    parent,
    start,
    label: child,
    nodes: []
  })
}

TimeTree.prototype.start = function (parent, child, start) {
  this.add(parent, child, start || Date.now())
}

TimeTree.prototype.stop = function (parent, child, stop) {
  if (parent === null) {
    this.root.stop = stop || Date.now()
    this.root.diff = (this.root.stop - this.root.start) || 0
    return
  }
  const parentNode = this.get(parent)
  if (parentNode) {
    // TODO manage better (stop on error event)
    const node = parentNode.nodes.find(_ => _.label === child) || {}
    node.stop = stop || Date.now()
    node.diff = (node.stop - node.start) || 0
  }
}

TimeTree.prototype.toJSON = function () {
  return Object.assign({}, this.root)
}

TimeTree.prototype.prittyPrint = function () {
  const decorateText = (node) => {
    node.label = `${node.label} ${node.diff} ms`
    if (node.nodes.length > 0) {
      node.nodes = node.nodes.map(_ => decorateText(_))
    }
    return node
  }
  const out = decorateText(this.toJSON())
  console.log(archy(out))
}

module.exports = TimeTree
