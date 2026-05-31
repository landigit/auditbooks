import { Creds } from 'src/utils/core/types';

export abstract class AuthDemuxBase {
  abstract getCreds(): Promise<Creds>;
}
