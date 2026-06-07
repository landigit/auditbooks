import type { IPC } from "utils/ipc/types";

export const ipc = new Proxy({} as IPC, {
  get(_target, prop, receiver) {
    const globalIpc =
      typeof window !== "undefined" ? (window as any).fyoIpc || (window as any).ipc : undefined;
    if (!globalIpc) return undefined;
    return Reflect.get(globalIpc, prop, receiver);
  },
});
