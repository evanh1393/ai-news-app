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

/** Prepare statements once per connection; returns { applyAll, ingested }. */
export function openWriter(db) {
	db.exec(DRIVE_FILES);
	const fts = ftsPlan(db);
	const q = {
		delLinks: db.prepare('DELETE FROM item_links WHERE item_id IN (SELECT id FROM items WHERE briefing_date = ?)'),
		delItems: db.prepare('DELETE FROM items WHERE briefing_date = ?'),
		delSections: db.prepare('DELETE FROM sections WHERE briefing_date = ?'),
		delBriefing: db.prepare('DELETE FROM briefings WHERE date = ?'),
		briefing: db.prepare(
			'INSERT INTO briefings (date, title, coverage, intro_html, outage_alert, created_at) VALUES (?, ?, ?, ?, ?, ?)'
		),
		section: db.prepare('INSERT INTO sections (briefing_date, position, title, note_html) VALUES (?, ?, ?, ?)'),
		item: db.prepare(
			'INSERT INTO items (briefing_date, category, position, headline, body, body_html, is_outage) VALUES (?, ?, ?, ?, ?, ?, ?)'
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
		q.briefing.run(d, b.title, b.coverage, b.intro_html, b.outage_alert ? 1 : 0, now);
		for (const s of p.sections) q.section.run(d, s.position, s.title, s.note_html);
		for (const i of p.items) {
			const id = q.item.run(d, i.category, i.position, i.headline, i.body, i.body_html, i.is_outage ? 1 : 0).lastInsertRowid;
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
