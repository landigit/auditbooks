import type { IPC } from 'utils/ipc/types';
import { ipc as localIpc } from 'src/ipc-router';

export const ipc = new Proxy({} as IPC, {
  get(_target, prop, receiver) {
    let globalIpc =
      typeof window !== 'undefined'
        ? (window as any).fyoIpc || (window as any).ipc
        : undefined;
    if (!globalIpc || Reflect.get(globalIpc, prop) === undefined) {
      globalIpc = localIpc;
    }
    if (!globalIpc) return undefined;
    return Reflect.get(globalIpc, prop, receiver);
  },
});
