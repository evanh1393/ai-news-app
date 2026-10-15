// npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { apiText, inlineTokens, itemSummary, linkHost, plainText } from '../src/lib/inline-md.js';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import * as schema from '../src/lib/server/schema.ts';
import { AFTER_MIGRATION, migrate, migrations, openWriter, verify } from './apply.js';
import { FormatError, checkInline, parseBriefing } from './briefing-md.js';
import { parseSources } from './sources-md.js';

const SAMPLE = `---
date: 2026-10-13
title: Big model day
coverage: Oct 12 7:30 AM – Oct 13 7:30 AM ET
outage_alert: false
---

Two launches and a funding round.

## Outages
- No major outages.

## Models & Releases
One note.

- **Model X ships** — Faster and cheaper. [Vendor blog](https://example.com/x) [News](https://news.example.com/a?b=1&c=2)
- **Model Y** — Open weights. [HF](https://huggingface.co/y)

## Markets & Funding
- **Startup raises $1B** — Series C. [Wire](https://wire.example.com/s)
`;

/**
 * The first column of the first row.
 * @param {import('better-sqlite3').Database} db
 * @param {string} sql
 */
const scalar = (db, sql) => db.prepare(sql).pluck().get();

/** A database built from ingest/migrations. */
function fresh() {
	const db = new Database(':memory:');
	migrate(db);
	return db;
}

/**
 * @param {string} src
 * @param {RegExp} re
 */
const rejects = (src, re) => assert.throws(() => parseBriefing(src, '2026-10-13'), (e) => e instanceof FormatError && re.test(e.message));

test('parses the sample into rows', () => {
	const p = parseBriefing(SAMPLE, '2026-10-13');
	assert.equal(p.briefing.title, 'Big model day');
	assert.equal(p.briefing.intro_md, 'Two launches and a funding round.');
	assert.deepEqual(
		p.sections.map((s) => [s.position, s.title]),
		[
			[0, 'Outages'],
			[1, 'Models & Releases'],
			[2, 'Markets & Funding']
		]
	);
	assert.equal(p.sections[1].note_md, 'One note.');
	assert.deepEqual(
		p.items.map((i) => [i.position, i.category, i.headline, i.is_outage]),
		[
			[0, 'Outages', null, true],
			[1, 'Models & Releases', 'Model X ships', false],
			[2, 'Models & Releases', 'Model Y', false],
			[3, 'Markets & Funding', 'Startup raises $1B', false]
		]
	);
	const x = p.items[1];
	assert.equal(x.body, 'Model X ships — Faster and cheaper. Vendor blog News');
	assert.equal(x.summary, 'Faster and cheaper.');
	assert.equal(p.items[0].summary, 'No major outages.');
	assert.match(x.body_md, /^\*\*Model X ships\*\* — Faster and cheaper\. \[Vendor blog\]\(https:\/\/example\.com\/x\)/);
	assert.deepEqual(x.links, [
		{ label: 'Vendor blog', url: 'https://example.com/x' },
		{ label: 'News', url: 'https://news.example.com/a?b=1&c=2' }
	]);
});

test('tokens carry raw HTML as text, never as markup', () => {
	assert.deepEqual(inlineTokens('**<img src=x onerror=alert(1)>** — hi <script>x</script> `<b>` [a"b](https://e.com/"x)'), [
		{ type: 'strong', text: '<img src=x onerror=alert(1)>' },
		{ type: 'text', text: ' — hi <script>x</script> ' },
		{ type: 'code', text: '<b>' },
		{ type: 'text', text: ' ' },
		{ type: 'link', text: 'a"b', url: 'https://e.com/%22x' }
	]);
});

test('links only render for plain https URLs', () => {
	for (const bad of ['javascript:alert(1)', 'http://e.com', 'data:text/html,hi', 'https://user:pw@e.com']) {
		assert.deepEqual(inlineTokens(`[x](${bad})`), [{ type: 'text', text: `[x](${bad})` }]);
		assert.throws(() => checkInline(`[x](${bad})`), FormatError);
	}
});

test('links show their real host unless the label is it', () => {
	assert.equal(linkHost('Vendor blog', 'https://www.example.com/x'), 'example.com');
	assert.equal(linkHost('google.com', 'https://evil.example/'), 'evil.example');
	assert.equal(linkHost('google.com.evil.example', 'https://evil.example/'), 'evil.example');
	assert.equal(linkHost('https://status.x.ai/', 'https://status.x.ai/'), null);
	assert.equal(linkHost('www.Example.com/docs', 'https://example.com/docs'), null);
});

test('copied text drops formatting and keeps link URLs', () => {
	assert.equal(
		plainText('**Big news** — `gpt-6` ships. [DOJ](https://www.justice.gov/x) [AP](https://apnews.com/y)\nline two'),
		'Big news — gpt-6 ships. DOJ (https://www.justice.gov/x) AP (https://apnews.com/y)\nline two'
	);
});

// Items in the shapes Grok Bot writes: em dash, en dash, hyphen or colon after the headline; bold and
// code mid-sentence; inline links; trailing citation links; a multi-line outage with its own bold lead.
const VARIED = `---
date: 2026-10-14
title: Varied
outage_alert: true
---

## Outages
- **Cursor down** — Agents failing since 8 PM ET. [Cursor Status](https://status.cursor.com)
- GitHub Actions degraded. [GitHub Status](https://www.githubstatus.com)

## News
- **Em dash** — Uses **bold** and \`gpt-6\` per [the docs](https://e.com/d), then more. [Reuters](https://r.com/a) [AP](https://ap.com/b)
- **En dash** – Second. [AP](https://ap.com/c)
- **Colon**: Third, (see [X](https://x.com/1)).
- **Hyphen** - Fourth.
- **Bold ends with a period.** — Fifth. [Src](https://s.com/), [Other](https://o.com/)
- **Only a link** — [Details](https://d.com/)
`;

test('items get a plain summary: no headline, formatting or citation links', () => {
	const p = parseBriefing(VARIED, '2026-10-14');
	assert.deepEqual(
		p.items.map((i) => [i.headline, i.summary]),
		[
			[null, 'Cursor down — Agents failing since 8 PM ET.\nGitHub Actions degraded.'],
			['Em dash', 'Uses bold and gpt-6 per the docs, then more.'],
			['En dash', 'Second.'],
			['Colon', 'Third, (see X).'],
			['Hyphen', 'Fourth.'],
			['Bold ends with a period.', 'Fifth.'],
			['Only a link', 'Details']
		]
	);
	// The links themselves are kept as data, citations included.
	assert.deepEqual(p.items[1].links.map((l) => l.label), ['the docs', 'Reuters', 'AP']);
	// The backfill derives the same thing from body_md.
	for (const i of p.items) assert.equal(itemSummary(i.body_md, i.is_outage), i.summary);
});

test('apiText drops formatting, keeps labels, and only drops trailing links when asked', () => {
	assert.equal(apiText('a **b** `c` [d](https://e.com/) [f](https://f.com/)'), 'a b c');
	assert.equal(apiText('a [d](https://e.com/) mid. [f](https://f.com/) | [g](https://g.com/)'), 'a d mid.');
	assert.equal(apiText('a **b** `c` [d](https://e.com/) [f](https://f.com/)', { citations: true }), 'a b c d f');
	assert.equal(apiText('unclosed ** bold   and\n[x](https://x.com/)'), 'unclosed bold and\nx');
	assert.equal(apiText('`a**b`'), 'a**b'); // code is literal text, not formatting
});

test('rejects off-format files', () => {
	rejects(SAMPLE.replace('date: 2026-10-13', 'date: 2026-10-12'), /doesn't match/);
	rejects(SAMPLE.replace('outage_alert: false', 'outage_alert: maybe'), /outage_alert/);
	rejects(SAMPLE.replace('---\ndate', 'date'), /front matter/);
	rejects(SAMPLE.replace('## Outages\n- No major outages.\n\n', ''), /Outages/);
	rejects(SAMPLE.replace('- **Model Y** — Open weights.', '- Model Y, open weights.'), /Headline/);
	rejects(SAMPLE + '\n```\ncode\n```\n', /code blocks/);
	rejects(SAMPLE + '| a | b |\n', /tables/);
	rejects(SAMPLE + 'wrapped continuation line\n', /single/);
	rejects(SAMPLE.replace('title: Big model day\n', 'title: Big model day\nauthor: me\n'), /front matter line/);
});

test('ingest replaces a day and keeps search in sync', () => {
	const db = fresh();
	const w = openWriter(db);
	const file = { name: 'briefing-2026-10-13.md', id: 'f1', md5: 'aaa' };
	const p = parseBriefing(SAMPLE, '2026-10-13');
	w.applyAll([{ parsed: p, file }], '2026-10-13T11:40:00.000Z');
	w.applyAll([{ parsed: p, file: { ...file, md5: 'bbb' } }], '2026-10-13T12:10:00.000Z');

	assert.equal(scalar(db, 'SELECT COUNT(*) n FROM items'), 4);
	assert.equal(scalar(db, 'SELECT COUNT(*) n FROM sections'), 3);
	assert.equal(scalar(db, 'SELECT COUNT(*) n FROM item_links'), 4);
	assert.equal(scalar(db, "SELECT value FROM meta WHERE key = 'ingested_at'"), '2026-10-13T12:10:00.000Z');
	assert.deepEqual([...w.ingested()], [['briefing-2026-10-13.md', 'bbb']]);
	const hits = db
		.prepare("SELECT i.headline FROM items_fts f JOIN items i ON i.id = f.rowid WHERE items_fts MATCH 'cheaper'")
		.all();
	assert.deepEqual(hits, [{ headline: 'Model X ships' }]);
	assert.equal(scalar(db, "SELECT COUNT(*) n FROM items_fts WHERE items_fts MATCH 'weights'"), 1);
	verify(db);
});

test('a failure rolls back the whole batch', () => {
	const db = fresh();
	const w = openWriter(db);
	const good = { parsed: parseBriefing(SAMPLE, '2026-10-13'), file: { name: 'a', id: 'a', md5: 'a' } };
	const bad = { parsed: { ...good.parsed, briefing: { ...good.parsed.briefing, date: '2026-10-14', title: null } }, file: { name: 'b', id: 'b', md5: 'b' } };
	// @ts-expect-error a row the database rejects (title is NOT NULL)
	assert.throws(() => w.applyAll([good, bad]));
	assert.equal(scalar(db, 'SELECT COUNT(*) n FROM briefings'), 0);
	assert.equal(scalar(db, 'SELECT COUNT(*) n FROM drive_files'), 0);
});

const SOURCES_SAMPLE = `# Monitoring Sources

Last updated: 2026-10-13.

- Notes to the bot, not shown.

## 1. Web search

Rule: newest first,
then by source.

- \`AI news <Month DD YYYY>\`

## 2. X

### search_news

- \`AI\`
- \`outage\` (filter for AI/cloud)

### Accounts watched

- Labs: @OpenAI, @AnthropicAI
`;

test('parses sources.md into rows', () => {
	assert.deepEqual(parseSources(SOURCES_SAMPLE), [
		{ grp: '1. Web search', subgroup: null, position: 1, value_md: 'Rule: newest first, then by source.' },
		{ grp: '1. Web search', subgroup: null, position: 2, value_md: '`AI news <Month DD YYYY>`' },
		{ grp: '2. X', subgroup: 'search_news', position: 3, value_md: '`AI`' },
		{ grp: '2. X', subgroup: 'search_news', position: 4, value_md: '`outage` (filter for AI/cloud)' },
		{ grp: '2. X', subgroup: 'Accounts watched', position: 5, value_md: 'Labs: @OpenAI, @AnthropicAI' }
	]);
});

test('rejects off-format sources.md', () => {
	/**
	 * @param {string} src
	 * @param {RegExp} re
	 */
	const bad = (src, re) => assert.throws(() => parseSources(src), (e) => e instanceof FormatError && re.test(e.message));
	bad('### Sub\n## G\n- a\n', /before any ## group/);
	bad('## G\n- a\n## G\n- b\n', /duplicate group/);
	bad('## G\n- a\nwrapped line\n', /one line/);
	bad('## G\n- a\n\nlater paragraph\n', /one line/);
	bad('## G\n- [x](javascript:alert(1))\n', /non-https/);
	bad('## G\n', /no sources/);
	bad(SOURCES_SAMPLE + '\n# Again\n', /first line/);
	bad(SOURCES_SAMPLE + '| a | b |\n', /tables/);
});

test('sources.md replaces the whole sources table', () => {
	const db = fresh();
	const w = openWriter(db);
	const file = { name: 'sources.md', id: 's', md5: 'a' };
	db.exec("INSERT INTO sources (grp, position, value_md) VALUES ('Old', 1, 'gone')");
	w.applyAll([{ sources: parseSources(SOURCES_SAMPLE), file }]);
	assert.deepEqual(db.prepare('SELECT grp FROM sources ORDER BY position').pluck().all(), ['1. Web search', '1. Web search', '2. X', '2. X', '2. X']);
	assert.deepEqual([...w.ingested()], [['sources.md', 'a']]);
	verify(db);
});

test('migrations run once, in order, and record the version', () => {
	const latest = migrations().length;
	const db = fresh();
	assert.equal(db.pragma('user_version', { simple: true }), latest);
	assert.deepEqual(migrate(db), []);
});

test('adopts a database from before migrations at version 1', () => {
	const db = new Database(':memory:');
	db.exec(migrations()[0].sql);
	db.exec("INSERT INTO briefings (date, title, created_at) VALUES ('2026-10-12', 'Kept', 't')");
	assert.deepEqual(migrate(db), migrations().slice(1).map((m) => m.name));
	assert.equal(scalar(db, 'SELECT title FROM briefings'), 'Kept');
});

test('0002 turns on full-text search, new or adopted', () => {
	assert.equal(scalar(fresh(), "SELECT value FROM meta WHERE key = 'fts'"), '1');
	const db = new Database(':memory:');
	db.exec(migrations()[0].sql);
	db.pragma('user_version = 1');
	db.exec("INSERT INTO meta (key, value) VALUES ('fts', '0')");
	migrate(db);
	assert.equal(scalar(db, "SELECT value FROM meta WHERE key = 'fts'"), '1');
});

test('refuses to adopt the old *_html schema', () => {
	const db = new Database(':memory:');
	db.exec('CREATE TABLE briefings (date TEXT PRIMARY KEY); CREATE TABLE items (id INTEGER PRIMARY KEY, body_html TEXT);');
	assert.throws(() => migrate(db), /predates the markdown schema/);
	assert.equal(db.pragma('user_version', { simple: true }), 0);
});

test('verify catches a search index out of step with items', () => {
	const db = fresh();
	openWriter(db).applyAll([{ parsed: parseBriefing(SAMPLE, '2026-10-13'), file: { name: 'a', id: 'a', md5: 'a' } }]);
	verify(db);
	db.exec("UPDATE items SET body = 'changed behind the index' WHERE position = 1");
	assert.throws(() => verify(db));
});

test('src/lib/server/schema.ts matches the migrated database', () => {
	const db = fresh();
	assert.ok(getTableConfig(schema.items).columns.some((c) => c.name === 'summary'));
	for (const table of Object.values(schema).map((t) => getTableConfig(/** @type {any} */ (t)))) {
		const cols = /** @type {{ name: string, type: string, notnull: number, pk: number }[]} */ (
			db.prepare('SELECT name, type, "notnull", pk FROM pragma_table_info(?)').all(table.name)
		);
		assert.ok(cols.length, `${table.name} isn't in the migrations`);
		const actual = cols.map((c) => [c.name, c.type.toLowerCase(), !!c.notnull || c.pk > 0]).sort();
		const expected = table.columns.map((c) => [c.name, c.getSQLType(), c.notNull]).sort();
		assert.deepEqual(expected, actual, `${table.name}: schema.ts columns (name, type, not null) vs the database`);
	}
});

/** A database at version 1 (before 0002) holding the sample's rows, as production was. */
function atVersion1() {
	const db = new Database(':memory:');
	db.exec(migrations()[0].sql);
	db.pragma('user_version = 1');
	const ins = db.prepare('INSERT INTO items (briefing_date, category, position, headline, body, body_md, is_outage) VALUES (?, ?, ?, ?, ?, ?, ?)');
	db.exec("INSERT INTO briefings (date, title, outage_alert, created_at) VALUES ('2026-10-13', 'Old', 0, 't')");
	for (const i of parseBriefing(VARIED.replace(/2026-10-14/, '2026-10-13'), '2026-10-13').items) {
		const id = ins.run('2026-10-13', i.category, i.position, i.headline, i.body, i.body_md, i.is_outage ? 1 : 0).lastInsertRowid;
		db.prepare('INSERT INTO items_fts(rowid, headline, body) VALUES (?, ?, ?)').run(id, i.headline, i.body);
	}
	return db;
}

test('0003 adds items.summary on a fresh database', () => {
	const db = fresh();
	assert.ok(db.prepare("SELECT 1 FROM pragma_table_info('items') WHERE name = 'summary' AND \"notnull\" = 1").get());
	assert.equal(db.pragma('user_version', { simple: true }), migrations().length);
	verify(db);
});

test('0003 backfills items.summary on a database at version 1', () => {
	const db = atVersion1();
	assert.deepEqual(migrate(db), migrations().slice(1).map((m) => m.name));
	const rows = /** @type {{ id: number, summary: string }[]} */ (db.prepare('SELECT id, summary FROM items ORDER BY position').all());
	const expected = parseBriefing(VARIED, '2026-10-14').items.map((i) => i.summary);
	assert.deepEqual(rows.map((r) => r.summary), expected);
	// IDs and the search index are untouched.
	assert.deepEqual(rows.map((r) => r.id), [1, 2, 3, 4, 5, 6, 7]);
	verify(db);
	// The backfill matches what a fresh ingest of the same file stores.
	const db2 = fresh();
	openWriter(db2).applyAll([{ parsed: parseBriefing(VARIED, '2026-10-14'), file: { name: 'a', id: 'a', md5: 'a' } }]);
	assert.deepEqual(db2.prepare('SELECT summary FROM items ORDER BY position').pluck().all(), expected);
});

test('the summary backfill is idempotent and only overwrites summary', () => {
	const db = atVersion1();
	migrate(db);
	const before = db.prepare('SELECT * FROM items ORDER BY id').all();
	AFTER_MIGRATION[3](db);
	assert.deepEqual(db.prepare('SELECT * FROM items ORDER BY id').all(), before);
});
