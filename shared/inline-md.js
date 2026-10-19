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

/**
 * The host to show beside a link, so its label can't pass for another site (briefing text comes from
 * an LLM reading the web). null when the label already is that host or a URL on it.
 * @param {string} label
 * @param {string} url an https URL from inlineTokens
 */
export function linkHost(label, url) {
	const host = new URL(url).hostname.replace(/^www\./, '');
	const shown = label.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
	return shown === host || shown.startsWith(`${host}/`) ? null : host;
}

/**
 * Inline markdown as plain text, for copying: formatting dropped, each link as "label (url)".
 * @param {string} src
 */
export function plainText(src) {
	return src
		.split('\n')
		.map((line) =>
			inlineTokens(line)
				.map((t) => (t.type === 'link' ? `${t.text} (${t.url})` : t.text))
				.join('')
		)
		.join('\n');
}

/** A news item's line: "**Headline** — summary", with an em dash, en dash, hyphen or colon (or nothing) between. */
export const ITEM = /^\*\*(.+?)\*\*\s*(?:[—–:-]\s*)?(.*)$/;

/**
 * Inline markdown as plain text for the API, where links travel separately as { label, url }:
 * formatting dropped, each link reduced to its label, and the run of links that ends a line (the
 * "[Reuters](…) [AP](…)" citations, maybe split by , ; | or ·) dropped unless nothing else is on the
 * line. Stray "**" goes too. Lines stay lines; spaces collapse.
 * @param {string} src
 * @param {{ citations?: boolean }} [opts] citations: keep trailing links' labels too (sources, intros)
 */
export function apiText(src, { citations = false } = {}) {
	return src
		.split('\n')
		.map((line) => {
			const tokens = inlineTokens(line);
			let end = tokens.length;
			if (!citations) {
				while (end && (tokens[end - 1].type === 'link' || /^[\s,;|·]*$/.test(tokens[end - 1].text))) end--;
				if (!tokens.slice(0, end).some((t) => t.text.trim())) end = tokens.length;
			}
			return tokens
				.slice(0, end)
				.map((t) => (t.type === 'text' ? t.text.replace(/\*\*/g, '') : t.text))
				.join('')
				.replace(/\s+/g, ' ')
				.trim();
		})
		.join('\n');
}

/**
 * An item's plain body (items.summary): the text after its bold headline and separator, by apiText's
 * rules. The outage item has no headline, so it's all of its lines.
 * @param {string} bodyMd items.body_md
 * @param {boolean} isOutage
 */
export function itemSummary(bodyMd, isOutage) {
	const m = isOutage ? null : ITEM.exec(bodyMd);
	return apiText(m ? m[2] : bodyMd);
}
