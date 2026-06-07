import { Fyo } from 'fyo';
import { TauriDemux } from 'fyo/demux/dbTauri';

/**
 * Global fyo for the Tauri Android app.
 *
 * - isElectron: true   → Config uses ipc.store (Tauri plugin-store)
 * - DatabaseDemux: TauriDemux → Reuses LynxDatabaseCore with
 *                                @tauri-apps/plugin-sql as the driver
 */
export const fyo = new Fyo({
  isTest: false,
  isElectron: true,
  DatabaseDemux: TauriDemux,
});

import { ipc as tauriIpc } from './ipc-tauri';

export const ipc = tauriIpc;
