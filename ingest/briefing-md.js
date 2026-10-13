// Strict parser for Grok Bot's daily briefing-YYYY-MM-DD.md (format spec: DRIVE_FORMAT.md on its side).
// Anything off-format throws, so a bad file is skipped instead of half-ingested. All HTML is produced
// here from escaped text: raw HTML in the markdown comes out as literal text, never as markup.

const MAX_BYTES = 512 * 1024;
const MAX_ITEMS = 200;
const OUTAGES = 'Outages';

export class FormatError extends Error {}

const fail = (msg) => {
	throw new FormatError(msg);
};

const escapeHtml = (s) =>
	s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Inline markdown: [label](https://…), **bold**, `code`. Everything else is escaped text.
const INLINE = /\[([^\[\]\n]+)\]\(([^\s()<>]+)\)|\*\*(.+?)\*\*|`([^`\n]+)`/g;

function httpsUrl(raw) {
	let u;
	try {
		u = new URL(raw);
	} catch {
		fail(`bad link URL: ${raw}`);
	}
	if (u.protocol !== 'https:' || u.username || u.password) fail(`link is not a plain https URL: ${raw}`);
	return u.href;
}

/** Render one line of inline markdown to { html, text, links }. */
export function renderInline(src) {
	let html = '';
	let text = '';
	const links = [];
	let last = 0;
	for (const m of src.matchAll(INLINE)) {
		html += escapeHtml(src.slice(last, m.index));
		text += src.slice(last, m.index);
		last = m.index + m[0].length;
		if (m[1] !== undefined) {
			const url = httpsUrl(m[2]);
			const label = m[1].trim();
			links.push({ label, url });
			html += `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
			text += label;
		} else if (m[3] !== undefined) {
			html += `<strong>${escapeHtml(m[3])}</strong>`;
			text += m[3];
		} else {
			html += `<code>${escapeHtml(m[4])}</code>`;
			text += m[4];
		}
	}
	html += escapeHtml(src.slice(last));
	text += src.slice(last);
	// A leftover "](" means a link that didn't match the https pattern above.
	if (/\]\(/.test(text)) fail(`malformed or non-https link in: ${src}`);
	return { html, text: text.replace(/\s+/g, ' ').trim(), links };
}

const paragraphs = (lines) =>
	lines
		.join('\n')
		.split(/\n\s*\n/)
		.map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
		.filter(Boolean);

function frontMatter(lines) {
	if (lines[0] !== '---') fail('missing front matter');
	const end = lines.indexOf('---', 1);
	if (end < 0) fail('unterminated front matter');
	const fm = {};
	for (const line of lines.slice(1, end)) {
		const m = /^(date|title|coverage|outage_alert):\s*(.*)$/.exec(line);
		if (!m) fail(`unexpected front matter line: ${line}`);
		fm[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.date ?? '') || Number.isNaN(Date.parse(fm.date))) fail('bad or missing date');
	if (!fm.title) fail('missing title');
	if (fm.outage_alert !== 'true' && fm.outage_alert !== 'false') fail('outage_alert must be true or false');
	return { fm, rest: lines.slice(end + 1) };
}

/**
 * Parse a briefing file. `expectDate` (from the file name) must match the front matter date.
 * Returns plain rows ready for the database; positions follow what the app expects
 * (outage item at 0, other items numbered 1..n across the whole briefing).
 */
export function parseBriefing(source, expectDate) {
	if (Buffer.byteLength(source) > MAX_BYTES) fail('file too large');
	const lines = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
	const { fm, rest } = frontMatter(lines);
	if (expectDate && fm.date !== expectDate) fail(`front matter date ${fm.date} doesn't match file name ${expectDate}`);

	const intro = [];
	const sections = [];
	let cur;
	for (const raw of rest) {
		const line = raw.trimEnd();
		if (/^```|^\s*\|/.test(line)) fail(`code blocks and tables aren't allowed: ${line}`);
		const h = /^##\s+(.+)$/.exec(line);
		if (h) {
			cur = { title: h[1].trim(), note: [], bullets: [] };
			if (sections.some((s) => s.title === cur.title)) fail(`duplicate section: ${cur.title}`);
			sections.push(cur);
		} else if (/^#/.test(line)) {
			fail(`unexpected heading: ${line}`);
		} else if (!cur) {
			intro.push(line);
		} else if (/^[-*]\s+/.test(line)) {
			cur.bullets.push(line.replace(/^[-*]\s+/, ''));
		} else if (line.trim() && cur.bullets.length) {
			fail(`text after the items in "${cur.title}" (items must be single "- " lines): ${line}`);
		} else {
			cur.note.push(line);
		}
	}

	if (!sections.length || sections[0].title !== OUTAGES) fail('"## Outages" must be the first section');
	if (sections.length < 2) fail('no news sections');

	const items = [];
	let pos = 0;
	const out = sections.map((s, i) => {
		const note = paragraphs(s.note);
		const section = {
			position: i,
			title: s.title,
			note_html: note.length ? note.map((p) => `<p>${renderInline(p).html}</p>`).join('') : null
		};
		if (s.title === OUTAGES) {
			if (!s.bullets.length) fail('Outages section has no item');
			// The app shows one outage line per briefing, so several bullets become one item.
			const parts = s.bullets.map(renderInline);
			items.push({
				category: OUTAGES,
				position: 0,
				headline: null,
				body: parts.map((p) => p.text).join(' '),
				body_html: parts.map((p) => p.html).join('<br>'),
				is_outage: true,
				links: parts.flatMap((p) => p.links)
			});
			return section;
		}
		if (!s.bullets.length) fail(`section "${s.title}" has no items`);
		for (const b of s.bullets) {
			const m = /^\*\*(.+?)\*\*\s*(?:[—–:-]\s*)?(.*)$/.exec(b);
			if (!m || !m[2].trim()) fail(`item must be "**Headline** — summary": ${b}`);
			const r = renderInline(b);
			items.push({
				category: s.title,
				position: ++pos,
				headline: renderInline(m[1]).text,
				body: r.text,
				body_html: r.html,
				is_outage: false,
				links: r.links
			});
		}
		return section;
	});
	if (items.length > MAX_ITEMS) fail('too many items');

	const introParas = paragraphs(intro);
	return {
		briefing: {
			date: fm.date,
			title: renderInline(fm.title).text,
			coverage: fm.coverage ? renderInline(fm.coverage).text : null,
			intro_html: introParas.length ? introParas.map((p) => `<p>${renderInline(p).html}</p>`).join('') : null,
			outage_alert: fm.outage_alert === 'true'
		},
		sections: out,
		items
	};
}
