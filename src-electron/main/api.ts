// @ts-expect-error
const fetch = require("node-fetch");

import type { RequestInit } from "node-fetch";

async function sendAPIRequest(
	endpoint: string,
	options: RequestInit | undefined,
) {
	return (await fetch(endpoint, options)).json() as unknown as {
		[key: string]: string | number | boolean;
	}[];
}

module.exports = { sendAPIRequest, default: sendAPIRequest };
