import { AuthDemuxBase } from 'utils/auth/types';
import { Creds } from 'utils/types';

export class AuthDemux extends AuthDemuxBase {
  constructor() {
    super();
  }

  async getCreds(): Promise<Creds> {
    return { errorLogUrl: '', tokenString: '', telemetryUrl: '' };
  }
}
