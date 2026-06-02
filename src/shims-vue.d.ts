declare global {
  const appIpc: import('src/utils/ipc/types').IPC;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
