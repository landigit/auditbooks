import fs from 'fs';
import path from 'path';
import { Creds } from 'utils/types';

export function getUrlAndTokenString(): Creds {
  const inProduction = process.env.NODE_ENV === 'production';
  const empty: Creds = { errorLogUrl: '', telemetryUrl: '', tokenString: '' };

  let errLogCredsPath = path.join(process.cwd(), 'log_creds.txt');
  if (!fs.existsSync(errLogCredsPath)) {
    errLogCredsPath = path.join(__dirname, '..', '..', 'log_creds.txt');
  }

  if (!fs.existsSync(errLogCredsPath)) {
    // eslint-disable-next-line no-console
    !inProduction && console.log(`${errLogCredsPath} doesn't exist, can't log`);
    return empty;
  }

  let apiKey, apiSecret, errorLogUrl, telemetryUrl;
  try {
    [apiKey, apiSecret, errorLogUrl, telemetryUrl] = fs
      .readFileSync(errLogCredsPath, 'utf-8')
      .split('\n')
      .filter((f) => f.length);
  } catch (err) {
    if (!inProduction) {
      // eslint-disable-next-line no-console
      console.log(`logging error using creds at: ${errLogCredsPath} failed`);
      // eslint-disable-next-line no-console
      console.log(err);
    }
    return empty;
  }

  return {
    errorLogUrl: errorLogUrl ? encodeURI(errorLogUrl) : '',
    telemetryUrl: telemetryUrl ? encodeURI(telemetryUrl) : '',
    tokenString: apiKey && apiSecret ? `token ${apiKey}:${apiSecret}` : '',
  };
}

export async function sendError(body: string) {
  const { errorLogUrl, tokenString } = getUrlAndTokenString();
  const headers = {
    Authorization: tokenString,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (!errorLogUrl) {
    return;
  }

  await fetch(errorLogUrl, { method: 'POST', headers, body }).catch((err) => {
    console.error('Failed to send error to mothership:', err);
  });
}
