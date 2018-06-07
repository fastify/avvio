import { EventEmitter } from "events";

declare function avvio(done?: Function): avvio.Avvio<null>;
declare function avvio<I>(
  instance: I,
  options?: avvio.Options,
  done?: Function
): avvio.Avvio<I>;

/**
 * Typescript cannot manage changes related to options "expose"
 * because undefined before runtime
 */
declare namespace avvio {
  type context<I> = I extends null ? Avvio<I> : mixedInstance<I>;
  type mixedInstance<I> = I & Server<I>;

  interface Options {
    expose?: {
      use?: string;
      after?: string;
      ready?: string;
    };
    autostart?: boolean;
    wrap?: boolean;
  }

  interface Plugin<O, I> {
    (server: context<I>, options: O, done: (err?: Error) => void): void;
  }

  interface Server<I> {
    use<O>(fn: avvio.Plugin<O, I>, options?: O): this;

    after(fn: (err: Error) => void): this;
    after(fn: (err: Error, done: Function) => void): this;
    after(fn: (err: Error, context: context<I>, done: Function) => void): this;

    ready(): Promise<context<I>>;
    ready(callback: (err?: Error) => void): any;
    ready(callback: (err: Error, done: Function) => void): any;
    ready(
      callback: (err: Error, context: context<I>, done: Function) => void
    ): any;
  }

  interface Avvio<I> extends EventEmitter, Server<I> {
    on(event: "start", listener: () => void): this;
    on(event: "preReady", listener: () => void): this;
    on(event: "close", listener: () => void): this;

    start(): this;

    override: (
      server: context<I>,
      fn: Plugin<any, I>,
      options: any
    ) => context<I>;

    onClose(fn: (context: context<I>, done: Function) => void): this;

    close(fn: (err: Error) => void): void;
    close(fn: (err: Error, done: Function) => void): void;
    close(fn: (err: Error, context: context<I>, done: Function) => void): void;

    started: boolean;
    booted: boolean;
  }
}

export = avvio;
