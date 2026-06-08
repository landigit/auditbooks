import { Fyo } from 'fyo';
import { DatabaseDemux } from 'fyo/demux/db';

/**
 * Global fyo for the Tauri Android/desktop app.
 *
 * - isElectron: true   → Config uses ipc.store (Tauri plugin-store)
 * - DatabaseDemux: DatabaseDemux → Uses unified Drizzle-based SQLite proxy
 */
export const fyo = new Fyo({
  isTest: false,
  isElectron: true,
  DatabaseDemux: DatabaseDemux,
});

import { ipc as tauriIpc } from './ipc-tauri';

export const ipc = tauriIpc;
