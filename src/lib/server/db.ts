// Read-only access to the briefing database.
// Grok Bot replaces the file atomically (new inode) every ~30 min, so we open a fresh
// connection per query batch. Opening SQLite read-only is cheap at this size.
import { DatabaseSync } from 'node:sqlite';
import { env } from '$env/dynamic/private';
import type { Briefing, Item, Link, OutageCheck, Section, Source } from '$lib/types';

const DB_PATH = env.BRIEFING_DB ?? '/opt/ai-briefing/data/briefing.db';

/** Run `fn` with a fresh read-only connection, closing it afterwards. */
export function withDb<T>(fn: (db: DatabaseSync) => T): T {
	const db = new DatabaseSync(DB_PATH, { readOnly: true });
	try {
		return fn(db);
	} finally {
		db.close();
	}
}

const all = <T>(db: DatabaseSync, sql: string, ...params: (string | number)[]) =>
	db.prepare(sql).all(...params) as unknown as T[];
const get = <T>(db: DatabaseSync, sql: string, ...params: (string | number)[]) =>
	db.prepare(sql).get(...params) as unknown as T | undefined;

export interface BriefingSummary extends Briefing {
	count: number;
}

export interface FullBriefing extends Briefing {
	outage: Item | undefined;
	sections: (Section & { items: (Item & { links: Link[] })[] })[];
}

export function listBriefings(): BriefingSummary[] {
	return withDb((db) =>
		all<BriefingSummary>(
			db,
			`SELECT b.*, (SELECT COUNT(*) FROM items i WHERE i.briefing_date = b.date AND i.is_outage = 0) AS count
			 FROM briefings b ORDER BY b.date DESC`
		)
	);
}

export function latestDate(): string | undefined {
	return withDb((db) => get<{ date: string }>(db, 'SELECT date FROM briefings ORDER BY date DESC LIMIT 1')?.date);
}

export function getBriefing(date: string): FullBriefing | undefined {
	return withDb((db) => {
		const b = get<Briefing>(db, 'SELECT * FROM briefings WHERE date = ?', date);
		if (!b) return undefined;
		const items = all<Item>(db, 'SELECT * FROM items WHERE briefing_date = ? ORDER BY position', date);
		const links = all<Link>(
			db,
			`SELECT l.* FROM item_links l JOIN items i ON i.id = l.item_id WHERE i.briefing_date = ?`,
			date
		);
		const withLinks = items.map((i) => ({ ...i, links: links.filter((l) => l.item_id === i.id) }));
		const sections = all<Section>(db, 'SELECT * FROM sections WHERE briefing_date = ? ORDER BY position', date);
		return {
			...b,
			outage: withLinks.find((i) => i.is_outage),
			sections: sections
				.filter((s) => s.title !== 'Outages')
				.map((s) => ({ ...s, items: withLinks.filter((i) => !i.is_outage && i.category === s.title) }))
		};
	});
}

export function outageChecks(): OutageCheck[] {
	return withDb((db) => all<OutageCheck>(db, 'SELECT * FROM outage_checks ORDER BY checked_at DESC'));
}

/** Newest outage check, used for the header dot and banners. */
export function outageStatus(): { active: boolean; latest: OutageCheck | undefined; ingestedAt: string | undefined } {
	return withDb((db) => {
		const latest = get<OutageCheck>(db, 'SELECT * FROM outage_checks ORDER BY checked_at DESC LIMIT 1');
		const ingestedAt = get<{ value: string }>(db, "SELECT value FROM meta WHERE key = 'ingested_at'")?.value;
		return { active: !!latest?.is_alert, latest, ingestedAt };
	});
}

export function listSources(): Source[] {
	return withDb((db) => all<Source>(db, 'SELECT * FROM sources ORDER BY position'));
}

export interface SearchHit extends Item {
	snippet: string;
}

/** Full-text search over items (FTS5). Each word is prefix-matched; all words must appear. */
export function search(q: string, limit = 50): SearchHit[] {
	const terms = q
		.split(/\s+/)
		.map((t) => t.replace(/"/g, ''))
		.filter(Boolean)
		.map((t) => `"${t}"*`);
	if (!terms.length) return [];
	return withDb((db) => {
		const fts = get<{ value: string }>(db, "SELECT value FROM meta WHERE key = 'fts'")?.value === '1';
		if (!fts) {
			const like = `%${q}%`;
			return all<SearchHit>(
				db,
				`SELECT *, substr(body, 1, 200) AS snippet FROM items WHERE headline LIKE ? OR body LIKE ?
				 ORDER BY briefing_date DESC, position LIMIT ?`,
				like, like, limit
			);
		}
		return all<SearchHit>(
			db,
			`SELECT i.*, snippet(items_fts, 1, '[[', ']]', '…', 24) AS snippet
			 FROM items_fts f JOIN items i ON i.id = f.rowid
			 WHERE items_fts MATCH ? ORDER BY bm25(items_fts) LIMIT ?`,
			terms.join(' '), limit
		);
	});
}
