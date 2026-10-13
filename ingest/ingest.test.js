// npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { inlineTokens } from '../src/lib/inline-md.js';
import { needsMigration, openWriter, sourceToMarkdown, staleDates } from './apply.js';
import { FormatError, checkInline, parseBriefing } from './briefing-md.js';

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

// Grok Bot's original schema, which openWriter migrates to the *_md columns in src/lib/server/schema.ts.
// FTS is created per test in each variant Grok Bot might use.
const BASE = `
CREATE TABLE briefings (date TEXT PRIMARY KEY, title TEXT NOT NULL, coverage TEXT, intro_html TEXT, outage_alert INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE sections (briefing_date TEXT NOT NULL, position INTEGER NOT NULL, title TEXT NOT NULL, note_html TEXT);
CREATE TABLE items (id INTEGER PRIMARY KEY, briefing_date TEXT NOT NULL, category TEXT NOT NULL, position INTEGER NOT NULL, headline TEXT, body TEXT NOT NULL, body_html TEXT NOT NULL, is_outage INTEGER NOT NULL);
CREATE TABLE item_links (item_id INTEGER NOT NULL, label TEXT NOT NULL, url TEXT NOT NULL);
CREATE TABLE sources (id INTEGER PRIMARY KEY, grp TEXT NOT NULL, subgroup TEXT, position INTEGER NOT NULL, value TEXT NOT NULL, note TEXT);
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
`;
const FTS = {
	standalone: 'CREATE VIRTUAL TABLE items_fts USING fts5(headline, body);',
	external: "CREATE VIRTUAL TABLE items_fts USING fts5(headline, body, content='items', content_rowid='id');",
	triggers: `CREATE VIRTUAL TABLE items_fts USING fts5(headline, body, content='items', content_rowid='id');
		CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN INSERT INTO items_fts(rowid, headline, body) VALUES (new.id, new.headline, new.body); END;
		CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN INSERT INTO items_fts(items_fts, rowid, headline, body) VALUES ('delete', old.id, old.headline, old.body); END;`
};

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

for (const [variant, ddl] of Object.entries(FTS)) {
	test(`ingest replaces a day and keeps search in sync (${variant} FTS)`, () => {
		const db = new Database(':memory:');
		db.exec(BASE + ddl);
		const w = openWriter(db);
		const file = { name: 'briefing-2026-10-13.md', id: 'f1', md5: 'aaa' };
		const p = parseBriefing(SAMPLE, '2026-10-13');
		w.applyAll([{ parsed: p, file }], '2026-10-13T11:40:00.000Z');
		w.applyAll([{ parsed: p, file: { ...file, md5: 'bbb' } }], '2026-10-13T12:10:00.000Z');

		assert.equal(db.prepare('SELECT COUNT(*) n FROM items').get().n, 4);
		assert.equal(db.prepare('SELECT COUNT(*) n FROM sections').get().n, 3);
		assert.equal(db.prepare('SELECT COUNT(*) n FROM item_links').get().n, 4);
		assert.equal(db.prepare("SELECT value FROM meta WHERE key = 'ingested_at'").get().value, '2026-10-13T12:10:00.000Z');
		assert.deepEqual([...w.ingested()], [['briefing-2026-10-13.md', 'bbb']]);
		const hits = db
			.prepare("SELECT i.headline FROM items_fts f JOIN items i ON i.id = f.rowid WHERE items_fts MATCH 'cheaper'")
			.all();
		assert.deepEqual(hits, [{ headline: 'Model X ships' }]);
		assert.equal(db.prepare("SELECT COUNT(*) n FROM items_fts WHERE items_fts MATCH 'weights'").get().n, 1);
	});
}

test('a failure rolls back the whole batch', () => {
	const db = new Database(':memory:');
	db.exec(BASE + FTS.standalone);
	const w = openWriter(db);
	const good = { parsed: parseBriefing(SAMPLE, '2026-10-13'), file: { name: 'a', id: 'a', md5: 'a' } };
	const bad = { parsed: { ...good.parsed, briefing: { ...good.parsed.briefing, date: '2026-10-14', title: null } }, file: { name: 'b', id: 'b', md5: 'b' } };
	assert.throws(() => w.applyAll([good, bad]));
	assert.equal(db.prepare('SELECT COUNT(*) n FROM briefings').get().n, 0);
	assert.equal(db.prepare('SELECT COUNT(*) n FROM drive_files').get().n, 0);
});

test('migrates the old *_html schema and sources to markdown', () => {
	const db = new Database(':memory:');
	db.exec(BASE + FTS.external);
	db.exec(`INSERT INTO briefings VALUES ('2026-10-12', 'Old', NULL, '<p>x</p>', 0, 't');
		INSERT INTO items (briefing_date, category, position, body, body_html, is_outage) VALUES ('2026-10-12', 'A', 1, 'old', '<b>old</b>', 0);
		INSERT INTO items_fts (rowid, headline, body) SELECT id, headline, body FROM items;
		INSERT INTO sources (grp, position, value) VALUES ('g', 1, '<code>AI news &lt;Month&gt;</code> / a &amp; b');`);
	assert.equal(needsMigration(db), true);
	openWriter(db);
	assert.equal(needsMigration(db), false);
	assert.equal(db.prepare('SELECT value_md FROM sources').get().value_md, '`AI news <Month>` / a & b');
	// The old day can't be converted, so it's stale until its file is ingested again.
	assert.deepEqual(staleDates(db), ['2026-10-12']);
	openWriter(db).applyAll([{ parsed: parseBriefing(SAMPLE.replaceAll('2026-10-13', '2026-10-12'), '2026-10-12'), file: { name: 'a', id: 'a', md5: 'a' } }]);
	assert.deepEqual(staleDates(db), []);
	assert.equal(db.prepare("SELECT intro_md FROM briefings").get().intro_md, 'Two launches and a funding round.');
});

test('sources conversion refuses anything but text and <code>', () => {
	assert.throws(() => sourceToMarkdown('<a href="https://e.com">x</a>'));
	assert.throws(() => sourceToMarkdown('<code>x</code><script>'));
	assert.throws(() => sourceToMarkdown('reads as **bold**'));
	assert.equal(sourceToMarkdown('https://status.x.ai'), 'https://status.x.ai');
});
