'use strict'

const archy = require('archy')

class TimeTree {
  constructor () {
    this.root = null
    this.tableId = new Map()
    this.tableLabel = new Map()
  }

  trackNode (node) {
    this.tableId.set(node.id, node)
    if (this.tableLabel.has(node.label)) {
      this.tableLabel.get(node.label).push(node)
    } else {
      this.tableLabel.set(node.label, [node])
    }
  }

  untrackNode (node) {
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

  getParent (parent) {
    if (parent === null) {
      return this.root
    }

    const parentNode = this.tableLabel.get(parent)
    if (parentNode.id) {
      return parentNode
    }
    return parentNode[parentNode.length - 1]
  }

  getNode (nodeId) {
    return this.tableId.get(nodeId)
  }

  add (parent, child, start) {
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

  start (parent, child, start = Date.now()) {
    return this.add(parent, child, start)
  }

  stop (nodeId, stop = Date.now()) {
    const node = this.getNode(nodeId)
    if (node) {
      node.stop = stop
      node.diff = (node.stop - node.start) || 0
      this.untrackNode(node)
    }
  }

  toJSON () {
    return Object.assign({}, this.root)
  }

  prittyPrint () {
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
}

module.exports = TimeTree
