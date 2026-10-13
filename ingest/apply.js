// Writes parsed briefings into briefing.db. Each date is replaced as a whole inside one transaction,
// so re-ingesting a day is safe and other days' rows (and item IDs) are untouched.

// Which Drive files have been ingested, so unchanged files are skipped. Created on first run.
const DRIVE_FILES = `CREATE TABLE IF NOT EXISTS drive_files (
	name TEXT PRIMARY KEY,
	file_id TEXT NOT NULL,
	md5 TEXT NOT NULL,
	ingested_at TEXT NOT NULL
)`;

/**
 * How to keep items_fts in sync, read from the database itself (Grok Bot's schema.sql isn't in
 * this repo): null when there's no FTS table or triggers on items already maintain it.
 */
function ftsPlan(db) {
	const fts = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'items_fts'").get();
	if (!fts) return null;
	const triggers = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'items'").get();
	if (triggers) return null;
	const cols = db
		.prepare("SELECT name FROM pragma_table_info('items_fts')")
		.all()
		.map((c) => c.name);
	const itemCols = new Set(
		db
			.prepare("SELECT name FROM pragma_table_info('items')")
			.all()
			.map((c) => c.name)
	);
	const missing = cols.filter((c) => !itemCols.has(c));
	if (missing.length) throw new Error(`items_fts columns not in items: ${missing.join(', ')}`);
	// External-content and contentless tables can't be DELETEd from; they take a 'delete' command
	// with the old values instead.
	const external = /\bcontent\s*=/i.test(fts.sql);
	const list = cols.join(', ');
	return {
		remove: external
			? db.prepare(
					`INSERT INTO items_fts(items_fts, rowid, ${list}) SELECT 'delete', id, ${list} FROM items WHERE briefing_date = ?`
				)
			: db.prepare('DELETE FROM items_fts WHERE rowid IN (SELECT id FROM items WHERE briefing_date = ?)'),
		add: db.prepare(`INSERT INTO items_fts(rowid, ${list}) SELECT id, ${list} FROM items WHERE briefing_date = ?`)
	};
}

/** True while the database still has the rendered *_html columns from Grok Bot's old schema. */
export function needsMigration(db) {
	return db.prepare("SELECT 1 FROM pragma_table_info('items') WHERE name = 'body_html'").get() !== undefined;
}

// Grok Bot's old sources.value held HTML: escaped text plus <code>…</code>, nothing else.
const SOURCE_HTML = /^(?:[^<&]|&(?:lt|gt|amp|quot|#39);|<code>[^<]*<\/code>)*$/;
const ENTITIES = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'" };
const unescapeHtml = (s) => s.replace(/&(?:lt|gt|amp|quot|#39);/g, (e) => ENTITIES[e]);

/** One sources value from HTML to markdown, refusing anything that wouldn't convert exactly. */
export function sourceToMarkdown(html) {
	if (!SOURCE_HTML.test(html)) throw new Error(`sources value isn't plain text and <code>: ${html}`);
	return html
		.split(/(<code>[^<]*<\/code>)/)
		.map((part, i) => {
			if (i % 2) return `\`${unescapeHtml(part.slice(6, -7))}\``;
			const text = unescapeHtml(part);
			if (/`|\*\*|\]\(/.test(text)) throw new Error(`sources value would read as markdown: ${html}`);
			return text;
		})
		.join('');
}

/**
 * Move from rendered *_html columns to markdown *_md columns. Briefing rows can't be converted back,
 * so this clears drive_files and the caller must re-ingest every day in the same commit; pull.js
 * does that because ingestedFiles() reports nothing while needsMigration() is true.
 */
function migrate(db) {
	if (!needsMigration(db)) return;
	db.exec(`
		ALTER TABLE briefings ADD COLUMN intro_md TEXT;
		ALTER TABLE briefings DROP COLUMN intro_html;
		ALTER TABLE sections ADD COLUMN note_md TEXT;
		ALTER TABLE sections DROP COLUMN note_html;
		ALTER TABLE items ADD COLUMN body_md TEXT NOT NULL DEFAULT '';
		ALTER TABLE items DROP COLUMN body_html;
		DELETE FROM drive_files;
	`);
	if (db.prepare("SELECT 1 FROM pragma_table_info('sources') WHERE name = 'value'").get()) {
		db.exec('ALTER TABLE sources RENAME COLUMN value TO value_md');
		const set = db.prepare('UPDATE sources SET value_md = ? WHERE id = ?');
		for (const r of db.prepare('SELECT id, value_md FROM sources').all()) set.run(sourceToMarkdown(r.value_md), r.id);
	}
}

/** Days whose items have no markdown, i.e. weren't re-ingested after the migration. */
export function staleDates(db) {
	return db
		.prepare("SELECT DISTINCT briefing_date FROM items WHERE body_md = '' ORDER BY briefing_date")
		.all()
		.map((r) => r.briefing_date);
}

/** Prepare statements once per connection; returns { applyAll, ingested }. */
export function openWriter(db) {
	db.exec(DRIVE_FILES);
	db.transaction(migrate)(db);
	const fts = ftsPlan(db);
	const q = {
		delLinks: db.prepare('DELETE FROM item_links WHERE item_id IN (SELECT id FROM items WHERE briefing_date = ?)'),
		delItems: db.prepare('DELETE FROM items WHERE briefing_date = ?'),
		delSections: db.prepare('DELETE FROM sections WHERE briefing_date = ?'),
		delBriefing: db.prepare('DELETE FROM briefings WHERE date = ?'),
		briefing: db.prepare(
			'INSERT INTO briefings (date, title, coverage, intro_md, outage_alert, created_at) VALUES (?, ?, ?, ?, ?, ?)'
		),
		section: db.prepare('INSERT INTO sections (briefing_date, position, title, note_md) VALUES (?, ?, ?, ?)'),
		item: db.prepare(
			'INSERT INTO items (briefing_date, category, position, headline, body, body_md, is_outage) VALUES (?, ?, ?, ?, ?, ?, ?)'
		),
		link: db.prepare('INSERT INTO item_links (item_id, label, url) VALUES (?, ?, ?)'),
		file: db.prepare(
			'INSERT INTO drive_files (name, file_id, md5, ingested_at) VALUES (?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET file_id = excluded.file_id, md5 = excluded.md5, ingested_at = excluded.ingested_at'
		),
		meta: db.prepare("INSERT INTO meta (key, value) VALUES ('ingested_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
	};

	function applyOne(p, now) {
		const d = p.briefing.date;
		fts?.remove.run(d);
		q.delLinks.run(d);
		q.delItems.run(d);
		q.delSections.run(d);
		q.delBriefing.run(d);
		const b = p.briefing;
		q.briefing.run(d, b.title, b.coverage, b.intro_md, b.outage_alert ? 1 : 0, now);
		for (const s of p.sections) q.section.run(d, s.position, s.title, s.note_md);
		for (const i of p.items) {
			const id = q.item.run(d, i.category, i.position, i.headline, i.body, i.body_md, i.is_outage ? 1 : 0).lastInsertRowid;
			for (const l of i.links) q.link.run(id, l.label, l.url);
		}
		fts?.add.run(d);
	}

	return {
		/** entries: [{ parsed, file: { name, id, md5 } }]. All or nothing. */
		applyAll: db.transaction((entries, now = new Date().toISOString()) => {
			for (const e of entries) {
				applyOne(e.parsed, now);
				q.file.run(e.file.name, e.file.id, e.file.md5, now);
			}
			if (entries.length) q.meta.run(now);
		}),
		ingested: () => new Map(db.prepare('SELECT name, md5 FROM drive_files').all().map((r) => [r.name, r.md5]))
	};
}
