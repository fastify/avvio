'use strict'

module.exports = {
  // private properties
  kAvvio: Symbol('Avvio#this'),
  kError: Symbol('Avvio#error'),
  kContext: Symbol('Avvio#context'),
  kOptions: Symbol('Avvio#options'),
  kPluginRoot: Symbol('Avvio#root'),
  kPluginQueue: Symbol('Avvio#plugin-queue'),
  kReadyQueue: Symbol('Avvio#ready-queue'),
  kCloseQueue: Symbol('Avvio#close-queue'),
  kResolvers: Symbol('Avvio#resolvers'),
  kWrappedThen: Symbol('Avvio#wrapped-then'),
  // private functions
  kExpose: Symbol('Avvio#expose'),
  kAddPlugin: Symbol('Avvio#add-plugin'),
  kLoadPlugin: Symbol('Avvio#load-plugin'),
  kLoadPluginNext: Symbol('Avvio#load-plugin-next'),
  kStart: Symbol('Avvio#start'),

  kOnCloseFunction: Symbol('Function#on-close'),

  // public properties
  kPluginMeta: Symbol.for('plugin-meta')
}
