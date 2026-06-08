import { Fyo } from 'fyo';
import { DatabaseDemux } from 'fyo/demux/db';

/**
 * Global fyo for the Lynx native app.
 *
 * - isElectron: true
 * - DatabaseDemux: DatabaseDemux → Uses unified Drizzle-based SQLite proxy
 */
export const fyo = new Fyo({
  isTest: false,
  isElectron: true,
  DatabaseDemux: DatabaseDemux,
});

export const ipc = (globalThis as any).ipc;
