import { ipc as tauriIpc } from './ipc-tauri';
import { ipc as polyfillIpc } from './ipc-polyfill';
import type { IPC } from 'utils/ipc/types';

// Detect at runtime if we are executing inside the Tauri WebView shell
const isTauriEnv =
  typeof window !== 'undefined' &&
  ((window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI__ !== undefined ||
    (window as any).ipc === undefined ||
    (window as any).ipc.store === undefined); // fallback check for preview shell window.ipc overrides

export const ipc: IPC = isTauriEnv ? tauriIpc : polyfillIpc;
