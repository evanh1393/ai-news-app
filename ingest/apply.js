// Writes parsed briefings into briefing.db. Each date is replaced as a whole inside one transaction,
// so re-ingesting a day is safe and other days' rows (and item IDs) are untouched.
import { readdirSync, readFileSync } from 'node:fs';

/**
 * @typedef {import('better-sqlite3').Database} Db
 * @typedef {import('./briefing-md.js').ParsedBriefing} ParsedBriefing
 * @typedef {{ parsed: ParsedBriefing, file: { name: string, id: string, md5: string } }} Entry
 */

// Schema changes are numbered SQL files, applied in order. PRAGMA user_version is the last one applied.
const MIGRATIONS_DIR = new URL('./migrations/', import.meta.url);

/** [{ version, name, sql }] from ingest/migrations, checked to be numbered 1, 2, 3, … */
export function migrations() {
	return readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort()
		.map((name, i) => {
			const version = Number(/^(\d{4})_[\w-]+\.sql$/.exec(name)?.[1]);
			if (version !== i + 1) throw new Error(`migration ${name} should be numbered ${String(i + 1).padStart(4, '0')}`);
			return { version, name, sql: readFileSync(new URL(name, MIGRATIONS_DIR), 'utf8') };
		});
}

/**
 * Migrations not yet applied. A database from before migrations existed (version 0 with tables)
 * already matches 0001_baseline.sql, so it starts at 1 once we've checked that it has the markdown columns.
 * @param {Db} db
 */
export function pendingMigrations(db) {
	let version = Number(db.pragma('user_version', { simple: true }));
	if (version === 0 && db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'briefings'").get()) {
		if (!db.prepare("SELECT 1 FROM pragma_table_info('items') WHERE name = 'body_md'").get())
			throw new Error('database predates the markdown schema; restore a newer copy');
		version = 1;
	}
	return migrations().filter((m) => m.version > version);
}

/**
 * Bring the schema up to date in one transaction. Returns the names of the migrations applied.
 * @param {Db} db
 * @returns {string[]}
 */
export function migrate(db) {
	return db.transaction(() => {
		const pending = pendingMigrations(db);
		for (const m of pending) db.exec(m.sql);
		const latest = migrations().length; // numbered 1..n, checked in migrations()
		if (Number(db.pragma('user_version', { simple: true })) !== latest) db.pragma(`user_version = ${latest}`);
		return pending.map((m) => m.name);
	})();
}

/**
 * Throw unless the database is sound: SQLite's own integrity check, no rows breaking a foreign key,
 * and items_fts matching items. Run on a migrated copy before it goes live.
 * @param {Db} db
 */
export function verify(db) {
	const integrity = db.pragma('integrity_check', { simple: true });
	if (integrity !== 'ok') throw new Error(`integrity_check: ${integrity}`);
	const orphans = /** @type {{ table: string, parent: string }[]} */ (db.pragma('foreign_key_check'));
	if (orphans.length) throw new Error(`foreign_key_check: ${orphans.map((o) => `${o.table} -> ${o.parent}`).join(', ')}`);
	// Throws SQLITE_CORRUPT_VTAB if the index has drifted from items.
	db.prepare("INSERT INTO items_fts(items_fts, rank) VALUES ('integrity-check', 1)").run();
}

/**
 * Prepare statements once per connection; returns { applyAll, ingested }.
 * @param {Db} db
 */
export function openWriter(db) {
	migrate(db);
	const q = {
		// items_fts is external-content (0001_baseline.sql): rows leave it via a 'delete' command with the old values.
		ftsRemove: db.prepare(
			"INSERT INTO items_fts(items_fts, rowid, headline, body) SELECT 'delete', id, headline, body FROM items WHERE briefing_date = ?"
		),
		ftsAdd: db.prepare('INSERT INTO items_fts(rowid, headline, body) SELECT id, headline, body FROM items WHERE briefing_date = ?'),
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

	/**
	 * @param {ParsedBriefing} p
	 * @param {string} now
	 */
	function applyOne(p, now) {
		const d = p.briefing.date;
		q.ftsRemove.run(d);
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
		q.ftsAdd.run(d);
	}

	return {
		/** All or nothing. */
		applyAll: db.transaction((/** @type {Entry[]} */ entries, now = new Date().toISOString()) => {
			for (const e of entries) {
				applyOne(e.parsed, now);
				q.file.run(e.file.name, e.file.id, e.file.md5, now);
			}
			if (entries.length) q.meta.run(now);
		}),
		ingested: () =>
			new Map(
				/** @type {{ name: string, md5: string }[]} */ (db.prepare('SELECT name, md5 FROM drive_files').all()).map((r) => [r.name, r.md5])
			)
	};
}
