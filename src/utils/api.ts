export async function sendAPIRequest(
	endpoint: string,
	options: RequestInit | undefined,
) {
	return await window.auditbooksIpc.sendAPIRequest(endpoint, options);
}
