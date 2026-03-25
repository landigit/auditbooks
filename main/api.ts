import fetch, { type RequestInit } from 'node-fetch';

export async function sendAPIRequest(
  endpoint: string,
  options: RequestInit | undefined
) {
  console.log(`--- MAIN PROCESS: API REQUEST TO: ${endpoint} ---`);
  const res = await fetch(endpoint, options);
  if (!res.ok) {
    const text = await res.text();
    console.error(`--- MAIN PROCESS: API ERROR: ${res.status} ${res.statusText} ---`);
    console.error(`Endpoint: ${endpoint}`);
    console.error(`Response Body Sample: ${text.slice(0, 200)}`);
    throw new Error(`API Request failed with status ${res.status}: ${res.statusText}`);
  }

  try {
    return (await res.json()) as unknown as {
      [key: string]: string | number | boolean;
    }[];
  } catch (err) {
    console.error(`--- MAIN PROCESS: JSON PARSE ERROR FOR: ${endpoint} ---`);
    const text = await res.text().catch(() => 'Already consumed');
    console.error(`Response body: ${text.slice(0, 200)}`);
    throw err;
  }
}
