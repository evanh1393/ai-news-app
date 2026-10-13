// Inline markdown shared by ingest (which validates it) and the app (which renders it):
// [label](https://…), **bold** and `code`; everything else is plain text. This returns tokens, not
// HTML. The app renders them as Svelte text, so nothing stored in the database can become markup.

const INLINE = /\[([^\[\]\n]+)\]\(([^\s()<>]+)\)|\*\*(.+?)\*\*|`([^`\n]+)`/g;

/**
 * The normalized URL, or null unless it's a plain https URL with no credentials.
 * @param {string} raw
 */
export function httpsUrl(raw) {
	let u;
	try {
		u = new URL(raw);
	} catch {
		return null;
	}
	return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
}

/** @typedef {{ type: 'text' | 'strong' | 'code', text: string } | { type: 'link', text: string, url: string }} Token */

/**
 * Split one line of inline markdown into tokens. A link whose URL isn't plain https stays text.
 * @param {string} src
 * @returns {Token[]}
 */
export function inlineTokens(src) {
	/** @type {Token[]} */
	const out = [];
	/** @param {string} s */
	const text = (s) => {
		if (s) out.push({ type: 'text', text: s });
	};
	let last = 0;
	for (const m of src.matchAll(INLINE)) {
		text(src.slice(last, m.index));
		last = m.index + m[0].length;
		if (m[1] !== undefined) {
			const url = httpsUrl(m[2]);
			if (url) out.push({ type: 'link', text: m[1].trim(), url });
			else text(m[0]);
		} else if (m[3] !== undefined) {
			out.push({ type: 'strong', text: m[3] });
		} else {
			out.push({ type: 'code', text: m[4] });
		}
	}
	text(src.slice(last));
	return out;
}
