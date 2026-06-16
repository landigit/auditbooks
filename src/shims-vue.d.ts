import { IPC } from 'main/preload';

declare global {
  const ipc: IPC;

  interface ImportMeta {
    dirname: string;
    filename: string;
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
