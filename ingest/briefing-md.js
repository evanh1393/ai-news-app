// Strict parser for Grok Bot's daily briefing-YYYY-MM-DD.md (format spec: DRIVE_FORMAT.md on its side).
// Anything off-format throws, so a bad file is skipped instead of half-ingested. Text is stored as
// markdown, not HTML; the app renders it through src/lib/inline-md.js, so raw HTML stays literal text.
import { inlineTokens } from '../src/lib/inline-md.js';

const MAX_BYTES = 512 * 1024;
const MAX_ITEMS = 200;
const OUTAGES = 'Outages';

export class FormatError extends Error {}

/**
 * @typedef {{ label: string, url: string }} ParsedLink
 * @typedef {{ position: number, title: string, note_md: string | null }} ParsedSection
 * @typedef {{ category: string, position: number, headline: string | null, body: string, body_md: string, is_outage: boolean, links: ParsedLink[] }} ParsedItem
 * @typedef {{ date: string, title: string, coverage: string | null, intro_md: string | null, outage_alert: boolean }} ParsedHeader
 * @typedef {{ briefing: ParsedHeader, sections: ParsedSection[], items: ParsedItem[] }} ParsedBriefing
 */

/**
 * @param {string} msg
 * @returns {never}
 */
function fail(msg) {
	throw new FormatError(msg);
}

/**
 * Check one line of inline markdown and return { text, links }: plain text for search, and the links.
 * @param {string} src
 * @returns {{ text: string, links: ParsedLink[] }}
 */
export function checkInline(src) {
	const tokens = inlineTokens(src);
	const text = tokens.map((t) => t.text).join('');
	// A leftover "](" means a link that didn't parse, or whose URL isn't plain https.
	if (/\]\(/.test(text)) fail(`malformed or non-https link in: ${src}`);
	const links = tokens.flatMap((t) => (t.type === 'link' ? [{ label: t.text, url: t.url }] : []));
	return { text: text.replace(/\s+/g, ' ').trim(), links };
}

/** @param {string[]} lines */
const paragraphs = (lines) =>
	lines
		.join('\n')
		.split(/\n\s*\n/)
		.map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
		.filter(Boolean);

/**
 * Paragraphs as stored: checked, then joined by blank lines. null when there are none.
 * @param {string[]} lines
 */
function paragraphsMd(lines) {
	const paras = paragraphs(lines);
	paras.forEach(checkInline);
	return paras.length ? paras.join('\n\n') : null;
}

/** @param {string[]} lines */
function frontMatter(lines) {
	if (lines[0] !== '---') fail('missing front matter');
	const end = lines.indexOf('---', 1);
	if (end < 0) fail('unterminated front matter');
	/** @type {Partial<Record<'date' | 'title' | 'coverage' | 'outage_alert', string>>} */
	const fm = {};
	for (const line of lines.slice(1, end)) {
		const m = /^(date|title|coverage|outage_alert):\s*(.*)$/.exec(line);
		if (!m) fail(`unexpected front matter line: ${line}`);
		fm[/** @type {keyof typeof fm} */ (m[1])] = m[2].trim().replace(/^"(.*)"$/, '$1');
	}
	const { date, title, coverage, outage_alert } = fm;
	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) fail('bad or missing date');
	if (!title) fail('missing title');
	if (outage_alert !== 'true' && outage_alert !== 'false') fail('outage_alert must be true or false');
	return { fm: { date, title, coverage, outage_alert }, rest: lines.slice(end + 1) };
}

/**
 * Parse a briefing file. `expectDate` (from the file name) must match the front matter date.
 * Returns plain rows ready for the database; positions follow what the app expects
 * (outage item at 0, other items numbered 1..n across the whole briefing).
 * @param {string} source
 * @param {string} [expectDate]
 * @returns {ParsedBriefing}
 */
export function parseBriefing(source, expectDate) {
	if (Buffer.byteLength(source) > MAX_BYTES) fail('file too large');
	const lines = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
	const { fm, rest } = frontMatter(lines);
	if (expectDate && fm.date !== expectDate) fail(`front matter date ${fm.date} doesn't match file name ${expectDate}`);

	/** @type {string[]} */
	const intro = [];
	/** @type {{ title: string, note: string[], bullets: string[] }[]} */
	const sections = [];
	/** @type {(typeof sections)[number] | undefined} */
	let cur;
	for (const raw of rest) {
		const line = raw.trimEnd();
		if (/^```|^\s*\|/.test(line)) fail(`code blocks and tables aren't allowed: ${line}`);
		const h = /^##\s+(.+)$/.exec(line);
		if (h) {
			const title = h[1].trim();
			if (sections.some((s) => s.title === title)) fail(`duplicate section: ${title}`);
			cur = { title, note: [], bullets: [] };
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

	/** @type {ParsedItem[]} */
	const items = [];
	let pos = 0;
	const out = sections.map((s, i) => {
		const section = { position: i, title: s.title, note_md: paragraphsMd(s.note) };
		if (s.title === OUTAGES) {
			if (!s.bullets.length) fail('Outages section has no item');
			// The app shows one outage line per briefing, so several bullets become one item, a line each.
			const parts = s.bullets.map(checkInline);
			items.push({
				category: OUTAGES,
				position: 0,
				headline: null,
				body: parts.map((p) => p.text).join(' '),
				body_md: s.bullets.join('\n'),
				is_outage: true,
				links: parts.flatMap((p) => p.links)
			});
			return section;
		}
		if (!s.bullets.length) fail(`section "${s.title}" has no items`);
		for (const b of s.bullets) {
			const m = /^\*\*(.+?)\*\*\s*(?:[—–:-]\s*)?(.*)$/.exec(b);
			if (!m || !m[2].trim()) fail(`item must be "**Headline** — summary": ${b}`);
			const r = checkInline(b);
			items.push({
				category: s.title,
				position: ++pos,
				headline: checkInline(m[1]).text,
				body: r.text,
				body_md: b,
				is_outage: false,
				links: r.links
			});
		}
		return section;
	});
	if (items.length > MAX_ITEMS) fail('too many items');

	return {
		briefing: {
			date: fm.date,
			title: checkInline(fm.title).text,
			coverage: fm.coverage ? checkInline(fm.coverage).text : null,
			intro_md: paragraphsMd(intro),
			outage_alert: fm.outage_alert === 'true'
		},
		sections: out,
		items
	};
}
