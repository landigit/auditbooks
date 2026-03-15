import { Fyo } from 'fyo';
import { HttpDatabaseDemux } from './demux/http_db';

const isElectron = typeof window !== 'undefined' && !!(window as any).ipc;

export const fyo = new Fyo({
  isTest: false,
  isElectron,
  DatabaseDemux: isElectron ? undefined : HttpDatabaseDemux as any,
});
