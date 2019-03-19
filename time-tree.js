'use strict'
const archy = require('archy')

function TimeTree () {
  this.root = null
  this.tableId = new Map()
  this.tableLabel = new Map()
}

TimeTree.prototype.trackNode = function (node) {
  this.tableId.set(node.id, node)
  if (this.tableLabel.has(node.label)) {
    this.tableLabel.get(node.label).push(node)
  } else {
    this.tableLabel.set(node.label, [node])
  }
}

TimeTree.prototype.untrackNode = function (node) {
  this.tableId.delete(node.id)

  const labelNode = this.tableLabel.get(node.label)
  if (labelNode.id) {
    this.tableLabel.delete(node.label)
    return
  }
  labelNode.pop()

  if (labelNode.length === 0) {
    this.tableLabel.delete(node.label)
  }
}

TimeTree.prototype.getParent = function (parent) {
  if (parent === null) {
    return this.root
  }

  const parentNode = this.tableLabel.get(parent)
  if (parentNode.id) {
    return parentNode
  }
  return parentNode[parentNode.length - 1]
}

TimeTree.prototype.getNode = function (nodeId) {
  return this.tableId.get(nodeId)
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
    this.trackNode(this.root)
    return this.root.id
  }

  const parentNode = this.getParent(parent)
  const nodeId = `${child}-${Math.random()}`
  const childNode = {
    id: nodeId,
    parent,
    start,
    label: child,
    nodes: []
  }
  parentNode.nodes.push(childNode)
  this.trackNode(childNode)
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
    this.untrackNode(node)
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
  return archy(out)
}

module.exports = TimeTree
