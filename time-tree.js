'use strict'
const archy = require('archy')

function TimeTree () {
  this.root = null
}

TimeTree.prototype.search = function (filter) {
  const seachNode = (node) => {
    const isMe = filter(node)
    if (!isMe) {
      return node.nodes
        .map(_ => seachNode(_))
        .filter(_ => _ !== null)
        .pop()
    }
    return node
  }
  return seachNode(this.root)
}

TimeTree.prototype.getParent = function (parent, nodeId) {
  if (parent === null) {
    return this.root
  }

  return this.search(node => node.label === parent)
}

TimeTree.prototype.getNode = function (nodeId) {
  return this.search(node => node.id === nodeId)
}

TimeTree.prototype.add = function (parent, child, start) {
  const isRoot = parent === null
  if (isRoot) {
    this.root = {
      id: 'root',
      label: child,
      start,
      nodes: []
    }
    return this.root.id
  }

  const node = this.getParent(parent)
  const nodeId = `${child}-${Math.random()}`
  node.nodes.push({
    id: nodeId,
    parent,
    start,
    label: child,
    nodes: []
  })
  return nodeId
}

TimeTree.prototype.start = function (parent, child, start) {
  return this.add(parent, child, start || Date.now())
}

TimeTree.prototype.stop = function (nodeId, stop) {
  const node = this.getNode(nodeId)
  if (node) {
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
