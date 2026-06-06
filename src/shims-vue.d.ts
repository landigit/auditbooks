import { IPC } from 'utils/ipc/types';

declare global {
  const ipc: IPC;
  const SystemInfo: {
    pixelWidth: number;
    pixelRatio: number;
  };
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
