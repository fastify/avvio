'use strict'

const kUntrackNode = Symbol('avvio.TimeTree.untrackNode')
const kTrackNode = Symbol('avvio.TimeTree.trackNode')
const kGetParent = Symbol('avvio.TimeTree.getParent')
const kGetNode = Symbol('avvio.TimeTree.getNode')
const kAddNode = Symbol('avvio.TimeTree.addNode')

class TimeTree {
  constructor () {
    this.root = null
    this.tableId = new Map()
    this.tableLabel = new Map()
  }

  [kTrackNode] (node) {
    this.tableId.set(node.id, node)
    if (this.tableLabel.has(node.label)) {
      this.tableLabel.get(node.label).push(node)
    } else {
      this.tableLabel.set(node.label, [node])
    }
  }

  [kUntrackNode] (node) {
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

  [kGetParent] (parent) {
    if (parent === null) {
      return this.root
    }

    const parentNode = this.tableLabel.get(parent)
    if (parentNode.id) {
      return parentNode
    }
    return parentNode[parentNode.length - 1]
  }

  [kGetNode] (nodeId) {
    return this.tableId.get(nodeId)
  }

  [kAddNode] (parent, childName, start) {
    const isRoot = parent === null
    if (isRoot) {
      this.root = {
        id: 'root',
        label: childName,
        start,
        nodes: []
      }
      this[kTrackNode](this.root)
      return this.root.id
    }

    const parentNode = this[kGetParent](parent)
    const nodeId = `${childName}-${Math.random()}`
    const childNode = {
      id: nodeId,
      parent,
      start,
      label: childName,
      nodes: []
    }
    parentNode.nodes.push(childNode)
    this[kTrackNode](childNode)
    return nodeId
  }

  start (parent, childName, start = Date.now()) {
    return this[kAddNode](parent, childName, start)
  }

  stop (nodeId, stop = Date.now()) {
    const node = this[kGetNode](nodeId)
    if (node) {
      node.stop = stop
      node.diff = (node.stop - node.start) || 0
      this[kUntrackNode](node)
    }
  }

  toJSON () {
    return Object.assign({}, this.root)
  }

  prettyPrint () {
    return prettyPrintTimeTree(this.toJSON())
  }
}

function prettyPrintTimeTree (obj, prefix = '') {
  let result = prefix

  const nodesCount = obj.nodes.length
  const lastIndex = nodesCount - 1
  result += `${obj.label} ${obj.diff} ms\n`

  for (let i = 0; i < nodesCount; ++i) {
    const node = obj.nodes[i]
    const prefix_ = prefix + (i === lastIndex ? '  ' : '│ ')

    result += prefix
    result += (i === lastIndex ? '└─' : '├─')
    result += (node.nodes.length === 0 ? '─ ' : '┬ ')
    result += prettyPrintTimeTree(node, prefix_).slice(prefix.length + 2)
  }
  return result
}

module.exports = TimeTree
