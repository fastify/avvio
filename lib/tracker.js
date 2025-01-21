'use strict'

class Tracker {
  constructor () {
    this.root = null
    this.tableId = new Map()
    this.tableLabel = new Map()
  }

  track (node) {
    this.tableId.set(node.id, node)
    if (this.tableLabel.has(node.label)) {
      this.tableLabel.get(node.label).push(node)
    } else {
      this.tableLabel.set(node.label, [node])
    }
  }

  untrack (node) {
    this.tableId.delete(node.id)

    const labelNode = this.tableLabel.get(node.label)
    labelNode.pop()

    if (labelNode.length === 0) {
      this.tableLabel.delete(node.label)
    }
  }

  findParentByLabel (label) {
    if (label === null) {
      return null
    } else if (this.tableLabel.has(label)) {
      const parent = this.tableLabel.get(label)
      return parent[parent.length - 1]
    } else {
      return null
    }
  }

  findNodeById (nodeId) {
    return this.tableId.get(nodeId)
  }

  add (parent, label, start) {
    const parentNode = this.findParentByLabel(parent)
    const isRoot = parentNode === null

    if (isRoot) {
      this.root = {
        parent: null,
        id: 'root',
        label,
        nodes: [],
        start,
        stop: null,
        diff: -1
      }
      this.track(this.root)
      return this.root.id
    }

    const nodeId = `${label}-${Math.random()}`
    /**
     * @type {TimeTreeNode}
     */
    const childNode = {
      parent,
      id: nodeId,
      label,
      nodes: [],
      start,
      stop: null,
      diff: -1
    }
    parentNode.nodes.push(childNode)
    this.track(childNode)
    return nodeId
  }

  start (parent, label, start = Date.now()) {
    return this.add(parent, label, start)
  }

  stop (nodeId, stop = Date.now()) {
    const node = this.findNodeById(nodeId)
    if (node) {
      node.stop = stop
      node.diff = (node.stop - node.start) || 0
      this.untrack(node)
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

module.exports.Tracker = Tracker
