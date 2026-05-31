import { AuthDemuxBase } from 'utils/auth/types';
import { Creds } from 'utils/types';

export class AuthDemux extends AuthDemuxBase {
  #isDesktop = false;
  constructor(isDesktop: boolean) {
    super();
    this.#isDesktop = isDesktop;
  }

  async getCreds(): Promise<Creds> {
    if (this.#isDesktop) {
      return await appIpc.getCreds();
    } else {
      return { errorLogUrl: '', tokenString: '', telemetryUrl: '' };
    }
  }
}
