/**
 * Properties of a schema which are to be translated,
 * irrespective of nesting.
 */
export const schemaTranslateables = [
	"label",
	"description",
	"placeholder",
	"section",
	"tab",
];

export function getIndexFormat(inp: string | string[] | unknown) {
	/**
	 * converts:
	 * ['This is an ', ,' interpolated ',' string.'] and
	 * 'This is an ${variableA} interpolated ${variableB} string.'
	 * to 'This is an ${0} interpolated ${1} string.'
	 */

	let string: string | undefined = undefined;
	let snippets: string[] | undefined = undefined;

	if (typeof inp === "string") {
		string = inp;
	} else if (Array.isArray(inp)) {
		snippets = inp;
	} else {
		throw new Error(`invalid input ${String(inp)} of type ${typeof inp}`);
	}

	let targetSnippets = snippets;
	if (targetSnippets === undefined) {
		targetSnippets = getSnippets(string as string);
	}

	if (targetSnippets.length === 1) {
		return targetSnippets[0];
	}

	let str = "";
	targetSnippets.forEach((s, i) => {
		if (i === targetSnippets.length - 1) {
			str += s;
			return;
		}
		str += `${s}\${${String(i)}}`;
	});

	return str;
}

export function getSnippets(str: string) {
	let start = 0;
	const snippets = [...str.matchAll(/\${[^}]+}/g)].map((m) => {
		const end = m.index;
		if (end === undefined) {
			return "";
		}
		const snip = str.slice(start, end);
		start = end + m[0].length;
		return snip;
	});

	snippets.push(str.slice(start));
	return snippets;
}

export function getWhitespaceSanitized(str: string) {
	return str.replace(/\s+/g, " ").trim();
}

export function getIndexList(str: string) {
	return [...str.matchAll(/\${([^}]+)}/g)].map(([, i]) => Number.parseInt(i));
}
