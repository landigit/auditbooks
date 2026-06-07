import { Fyo } from 'fyo';
import { LynxDemux } from 'fyo/demux/dbLynx';

/**
 * Global fyo for the Lynx native app.
 *
 * - isElectron: false  → Config uses a plain in-memory Map (no ipc.store)
 * - DatabaseDemux: LynxDemux → on device uses AuditbooksSqliteModule;
 *                              in rspeedy dev browser falls back to HTTP IPC
 */
export const fyo = new Fyo({
  isTest: false,
  isElectron: true,
  DatabaseDemux: LynxDemux,
});

export const ipc = (globalThis as any).ipc;
