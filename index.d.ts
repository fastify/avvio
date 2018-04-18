// Type definitions for avvio
// Project: https://github.com/mcollina/avvio
// Definitions by: HelloEdit https://github.com/HelloEdit/

/// <reference types="node" />

declare function avvio<T = any>(
  server: T,
  done: () => void
): avvio.BootInstance<T>;

declare function avvio<T = any>(
  server?: T,
  opts?: avvio.AvvioOptions,
  done?: () => void
): avvio.BootInstance<T>;

declare namespace avvio {
  interface AvvioOptions {
    autostart?: boolean;
    expose?: ExposeOptions;
  }

  interface ExposeOptions {
    use?: string;
    after?: string;
    ready?: string;
  }

  interface BootInstance<T> {
    started: boolean;
    booted: boolean;
    start(): this;

    use(func: (server: BootInstance<T>, opts: string) => Promise<void>): this;
    use(
      func: (server: BootInstance<T>, opts: any, done: () => void) => void
    ): this;

    after(func?: (err: any) => void): this;
    after(func?: (err: any, done: () => void) => void): this;
    after(
      func?: (err: any, context: BootInstance<T>, done: () => void) => void
    ): this;

    ready(): Promise<any>;
    ready(func?: (err: any) => void): any;
    ready(func?: (err: any, done: () => void) => void): any;
    ready(
      func?: (err: any, context: BootInstance<T>, done: () => void) => void
    ): any;

    onClose(func: (context: BootInstance<T>) => void): void;
    onClose(func: (context: BootInstance<T>, done: () => void) => void): void;

    // TODO: override

    close(func: (err: any) => void): void;
    close(func: (err: any, done: () => void) => void): void;
    close(
      func: (err: any, context: BootInstance<T>, done: () => void) => void
    ): void;

    start(): this;
  }

  export function express<T = any>(server?: T): avvio.BootInstance<T>;
}

export = avvio;
