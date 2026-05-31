import type { IPC } from 'src/utils/ipc/types';
import Vue, { VNode } from 'vue';

declare global {
  const appIpc: IPC;
  namespace JSX {
    type Element = VNode;
    type ElementClass = Vue;
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [elem: string]: any;
    }
  }

  interface Window {
    appIpc: IPC;
  }
}
