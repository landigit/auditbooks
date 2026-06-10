/**
 * sendAPIRequest: in Tauri, we use the browser's native fetch directly.
 * Electron's ipc.sendAPIRequest is no longer needed.
 */
export async function sendAPIRequest(
  endpoint: string,
  options: RequestInit | undefined
) {
  const response = await fetch(endpoint, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
