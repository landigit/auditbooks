import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { Main } from 'main';
import fetch from 'node-fetch';
import type { Creds } from 'utils/types';
import { rendererLog } from './helpers';

export function getUrlAndTokenString(): Creds {
  const inProduction = app.isPackaged;
  const empty: Creds = { errorLogUrl: '', telemetryUrl: '', tokenString: '' };
  let errLogCredsPath = path.join(
    process.resourcesPath,
    '../creds/log_creds.txt'
  );
  if (!fs.existsSync(errLogCredsPath)) {
    errLogCredsPath = path.join(__dirname, '..', '..', 'log_creds.txt');
  }

  if (!fs.existsSync(errLogCredsPath)) {
    // eslint-disable-next-line no-console
    !inProduction && console.log(`${errLogCredsPath} doesn't exist, can't log`);
    return empty;
  }

  let apiKey;
  let apiSecret;
  let errorLogUrl;
  let telemetryUrl;
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
    errorLogUrl: encodeURI(errorLogUrl),
    telemetryUrl: encodeURI(telemetryUrl),
    tokenString: `token ${apiKey}:${apiSecret}`,
  };
}

export async function sendError(body: string, main: Main) {
  const { errorLogUrl, tokenString } = getUrlAndTokenString();
  const headers = {
    Authorization: tokenString,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  await fetch(errorLogUrl, { method: 'POST', headers, body }).catch((err) => {
    rendererLog(main, err);
  });
}
