async function plugin (app) {
  app.loaded = true
}

// this symbol is assigned by fastify-plugin
plugin[Symbol.for('plugin-meta')] = { name: 'esm-plugin-meta' }

export default plugin
