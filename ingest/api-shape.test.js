// npm test: /api/v1 output is plain text (src/lib/api-shape.js).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { apiBriefing, apiBriefingSummary, apiHits, apiSource } from '../src/lib/api-shape.js';
import { migrate, openWriter } from './apply.js';
import { parseBriefing } from './briefing-md.js';
import { parseSources } from './sources-md.js';

const BRIEFING = `---
date: 2026-10-14
title: Chip selloff
coverage: Oct 13 7:30 AM – Oct 14 7:30 AM ET
outage_alert: true
---

**Chips** fell; see [Reuters](https://r.com/x) and \`KOSPI\`.

## Outages
- **Cursor down** — Agents failing. [Cursor Status](https://status.cursor.com)
- GitHub Actions degraded.

## Markets
A **note** with [a link](https://n.com/).

- **The AI chip trade cracked** — KOSPI fell **6%** as \`SK Hynix\` slid, per [AFP](https://afp.com/a). [Reuters via KWSN](https://kwsn.com/b) [AFP](https://afp.com/a)
- **Anthropic investor day**: Oct 14. [Bloomberg](https://bloomberg.com/c)

## Models
- **Gemini 4 Argon** – Out now. [Google](https://blog.google/d), [The Verge](https://theverge.com/e)
`;

const SOURCES = `## 1. Web search
- \`AI news <Month DD YYYY>\`
- [OpenAI blog](https://openai.com/news/) for **launches**
`;

/** Markdown or HTML syntax, anywhere. */
const SYNTAX = [/\*\*/, /\]\(/, /\[\[/, /\]\]/, /`/, /<\/?[a-z][\w-]*(\s[^<>]*)?\/?>/, /&[a-z]+;|&#\d+;/];

/**
 * Every string in a JSON value, with its path.
 * @param {unknown} v
 * @param {string} [path]
 * @returns {[string, string][]}
 */
const strings = (v, path = '$') =>
	typeof v === 'string'
		? [[path, v]]
		: v && typeof v === 'object'
			? Object.entries(v).flatMap(([k, x]) => strings(x, `${path}.${k}`))
			: [];

/** @param {unknown} out */
function assertPlain(out) {
	const all = strings(out);
	assert.ok(all.length >= 4);
	for (const [path, s] of all) for (const re of SYNTAX) assert.doesNotMatch(s, re, `${path}: ${s}`);
}

function db() {
	const d = new Database(':memory:');
	migrate(d);
	openWriter(d).applyAll([
		{ parsed: parseBriefing(BRIEFING, '2026-10-14'), file: { name: 'b', id: 'b', md5: 'b' } },
		{ sources: parseSources(SOURCES), file: { name: 'sources.md', id: 's', md5: 's' } }
	]);
	return d;
}

/**
 * What getBriefing() in src/lib/server/db.ts returns, built with raw SQL ($app isn't importable here).
 * @param {import('better-sqlite3').Database} d
 */
function fullBriefing(d) {
	/** @param {any} r */
	const bool = (r) => ({ ...r, is_outage: !!r.is_outage });
	const b = /** @type {any} */ (d.prepare('SELECT * FROM briefings').get());
	const links = /** @type {any[]} */ (d.prepare('SELECT * FROM item_links').all());
	const items = /** @type {any[]} */ (d.prepare('SELECT * FROM items ORDER BY position').all()).map((i) => ({
		...bool(i),
		links: links.filter((l) => l.item_id === i.id)
	}));
	const sections = /** @type {any[]} */ (d.prepare("SELECT * FROM sections WHERE title != 'Outages' ORDER BY position").all());
	return {
		...b,
		outage_alert: !!b.outage_alert,
		outage: items.find((i) => i.is_outage),
		sections: sections.map((s) => ({ ...s, items: items.filter((i) => !i.is_outage && i.category === s.title) }))
	};
}

test('a briefing comes out as plain header/body items', () => {
	const out = apiBriefing(fullBriefing(db()));
	assertPlain(out);
	assert.doesNotMatch(JSON.stringify(out), /<|_md"/);
	assert.equal(out.intro, 'Chips fell; see Reuters and KOSPI.');
	assert.deepEqual(out.outage && { header: out.outage.header, body: out.outage.body }, {
		header: 'Outages',
		body: 'Cursor down — Agents failing.\nGitHub Actions degraded.'
	});
	assert.deepEqual(out.sections[0], {
		title: 'Markets',
		note: 'A note with a link.',
		items: [
			{
				id: 2,
				position: 1,
				header: 'The AI chip trade cracked',
				body: 'KOSPI fell 6% as SK Hynix slid, per AFP.',
				links: [
					{ label: 'AFP', url: 'https://afp.com/a' },
					{ label: 'Reuters via KWSN', url: 'https://kwsn.com/b' },
					{ label: 'AFP', url: 'https://afp.com/a' }
				]
			},
			{ id: 3, position: 2, header: 'Anthropic investor day', body: 'Oct 14.', links: [{ label: 'Bloomberg', url: 'https://bloomberg.com/c' }] }
		]
	});
	assert.equal(out.sections[1].items[0].body, 'Out now.');
});

test('the briefing list is plain', () => {
	const d = db();
	const row = /** @type {any} */ (d.prepare('SELECT *, 3 AS count FROM briefings').get());
	const out = apiBriefingSummary({ ...row, outage_alert: !!row.outage_alert });
	assertPlain(out);
	assert.deepEqual(Object.keys(out), ['date', 'title', 'coverage', 'intro', 'outage_alert', 'count']);
});

test('search hits are items plus date and category, with no snippet markers', () => {
	const d = db();
	// As search() returns them: item columns plus an FTS snippet with [[ ]] markers.
	const hits = /** @type {any[]} */ (
		d
			.prepare("SELECT i.*, snippet(items_fts, 1, '[[', ']]', '…', 24) AS snippet FROM items_fts f JOIN items i ON i.id = f.rowid WHERE items_fts MATCH 'kospi OR argon' ORDER BY i.position")
			.all()
	).map((h) => ({ ...h, is_outage: !!h.is_outage }));
	assert.match(hits[0].snippet, /\[\[/);
	const out = apiHits(hits, /** @type {any[]} */ (d.prepare('SELECT * FROM item_links').all()));
	assertPlain(out);
	assert.doesNotMatch(JSON.stringify(out), /<|snippet|_md"/);
	assert.deepEqual(out[1], {
		date: '2026-10-14',
		category: 'Models',
		id: 4,
		position: 3,
		header: 'Gemini 4 Argon',
		body: 'Out now.',
		links: [
			{ label: 'Google', url: 'https://blog.google/d' },
			{ label: 'The Verge', url: 'https://theverge.com/e' }
		]
	});
});

test('sources are plain text with their links as data', () => {
	const out = /** @type {any[]} */ (db().prepare('SELECT * FROM sources ORDER BY position').all()).map(apiSource);
	assertPlain(out);
	assert.deepEqual(out, [
		// A query template's <placeholder> is literal text, not markup.
		{ group: '1. Web search', subgroup: null, position: 1, text: 'AI news <Month DD YYYY>', links: [] },
		{ group: '1. Web search', subgroup: null, position: 2, text: 'OpenAI blog for launches', links: [{ label: 'OpenAI blog', url: 'https://openai.com/news/' }] }
	]);
});
