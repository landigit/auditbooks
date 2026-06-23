import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile, exists } from '@tauri-apps/plugin-fs';
import { Creds } from 'utils/types';

export async function getUrlAndTokenString(): Promise<Creds> {
  try {
    const credsPath = await resolveResource('log_creds.txt');
    const fileExists = await exists(credsPath);
    if (!fileExists) {
      return { errorLogUrl: '', telemetryUrl: '', tokenString: '' };
    }
    const content = await readTextFile(credsPath);
    const [apiKey, apiSecret, errorLogUrl, telemetryUrl] = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return {
      errorLogUrl: errorLogUrl ? encodeURI(errorLogUrl) : '',
      telemetryUrl: telemetryUrl ? encodeURI(telemetryUrl) : '',
      tokenString: apiKey && apiSecret ? `token ${apiKey}:${apiSecret}` : '',
    };
  } catch (err) {
    return { errorLogUrl: '', telemetryUrl: '', tokenString: '' };
  }
}

export async function sendErrorToMothership(body: unknown) {
  const { errorLogUrl, tokenString } = await getUrlAndTokenString();
  if (!errorLogUrl) {
    return;
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (tokenString) {
    headers.Authorization = tokenString;
  }
  await fetch(errorLogUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }).catch(() => {
    // Ignore errors when sending logs
  });
}
