export async function sendAPIRequest(
  endpoint: string,
  options: RequestInit | undefined
) {
  return await appIpc.sendAPIRequest(endpoint, options);
}
