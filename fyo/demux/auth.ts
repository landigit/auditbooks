import { AuthDemuxBase } from 'utils/auth/types';
import type { Creds } from 'utils/types';

export class AuthDemux extends AuthDemuxBase {
  #isElectron = false;
  constructor(isElectron: boolean) {
    super();
    this.#isElectron = isElectron;
  }

  async getCreds(): Promise<Creds> {
    if (this.#isElectron) {
      return await ipc.getCreds();
    }
    return { errorLogUrl: '', tokenString: '', telemetryUrl: '' };
  }
}
