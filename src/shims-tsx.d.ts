import type { IPC } from 'utils/ipc/types';
import Vue, { VNode } from 'vue';

declare global {
  const ipc: IPC;
  namespace JSX {
    type Element = VNode;
    type ElementClass = Vue;
    interface IntrinsicElements {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      [elem: string]: any;
    }
  }

  interface Window {
    ipc: IPC;
  }
}
