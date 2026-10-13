// npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { inlineTokens } from '../src/lib/inline-md.js';
import { migrate, migrations, openWriter } from './apply.js';
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

/** A database built from ingest/migrations. */
function fresh() {
	const db = new Database(':memory:');
	migrate(db);
	return db;
}

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

test('ingest replaces a day and keeps search in sync', () => {
	const db = fresh();
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
	// Throws if the index has drifted from items.
	db.prepare("INSERT INTO items_fts(items_fts) VALUES ('integrity-check')").run();
});

test('a failure rolls back the whole batch', () => {
	const db = fresh();
	const w = openWriter(db);
	const good = { parsed: parseBriefing(SAMPLE, '2026-10-13'), file: { name: 'a', id: 'a', md5: 'a' } };
	const bad = { parsed: { ...good.parsed, briefing: { ...good.parsed.briefing, date: '2026-10-14', title: null } }, file: { name: 'b', id: 'b', md5: 'b' } };
	assert.throws(() => w.applyAll([good, bad]));
	assert.equal(db.prepare('SELECT COUNT(*) n FROM briefings').get().n, 0);
	assert.equal(db.prepare('SELECT COUNT(*) n FROM drive_files').get().n, 0);
});

test('migrations run once, in order, and record the version', () => {
	const latest = migrations().at(-1).version;
	const db = fresh();
	assert.equal(db.pragma('user_version', { simple: true }), latest);
	assert.deepEqual(migrate(db), []);
});

test('adopts a database from before migrations at version 1', () => {
	const db = new Database(':memory:');
	db.exec(migrations()[0].sql);
	db.exec("INSERT INTO briefings (date, title, created_at) VALUES ('2026-10-12', 'Kept', 't')");
	assert.deepEqual(migrate(db), migrations().slice(1).map((m) => m.name));
	assert.equal(db.prepare('SELECT title FROM briefings').get().title, 'Kept');
});

test('refuses to adopt the old *_html schema', () => {
	const db = new Database(':memory:');
	db.exec('CREATE TABLE briefings (date TEXT PRIMARY KEY); CREATE TABLE items (id INTEGER PRIMARY KEY, body_html TEXT);');
	assert.throws(() => migrate(db), /predates the markdown schema/);
	assert.equal(db.pragma('user_version', { simple: true }), 0);
});
