// Read-only access to the briefing database through Drizzle.
// briefing-pull replaces the file atomically (new inode) when it ingests, so we open a fresh
// connection per query batch. Opening SQLite read-only is cheap at this size.
import Database from 'better-sqlite3';
import { asc, count, desc, eq, getTableColumns, like, or, sql } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { BRIEFING_DB } from '$app/env/private';
import * as schema from './schema';
import { briefings, itemLinks, items, meta, outageChecks, sections, sources } from './schema';
import type { Briefing, Item, Link, OutageCheck, Section, Source } from './schema';

const DB_PATH = BRIEFING_DB;

type Db = BetterSQLite3Database<typeof schema>;

/** Run `fn` with a fresh read-only connection, closing it afterwards. */
export function withDb<T>(fn: (db: Db) => T): T {
	const client = new Database(DB_PATH, { readonly: true, fileMustExist: true });
	try {
		return fn(drizzle(client, { schema }));
	} finally {
		client.close();
	}
}

const metaValue = (db: Db, key: string) => db.select().from(meta).where(eq(meta.key, key)).get()?.value;

export interface BriefingSummary extends Briefing {
	count: number;
}

export interface FullBriefing extends Briefing {
	outage: Item | undefined;
	sections: (Section & { items: (Item & { links: Link[] })[] })[];
}

/** One page of rows plus the total row count, for offset pagination. */
export interface Page<T> {
	rows: T[];
	total: number;
}

export function listBriefings(limit: number, offset: number): Page<BriefingSummary> {
	return withDb((db) => ({
		rows: db
			.select({
				...getTableColumns(briefings),
				count: sql<number>`(SELECT COUNT(*) FROM ${items} WHERE ${items.briefing_date} = ${briefings.date} AND ${items.is_outage} = 0)`
			})
			.from(briefings)
			.orderBy(desc(briefings.date))
			.limit(limit)
			.offset(offset)
			.all(),
		total: db.select({ n: count() }).from(briefings).get()?.n ?? 0
	}));
}

export function latestDate(): string | undefined {
	return withDb(
		(db) => db.select({ date: briefings.date }).from(briefings).orderBy(desc(briefings.date)).limit(1).get()?.date
	);
}

export function getBriefing(date: string): FullBriefing | undefined {
	return withDb((db) => {
		const b = db.select().from(briefings).where(eq(briefings.date, date)).get();
		if (!b) return undefined;
		const dayItems = db.select().from(items).where(eq(items.briefing_date, date)).orderBy(asc(items.position)).all();
		const links = db
			.select(getTableColumns(itemLinks))
			.from(itemLinks)
			.innerJoin(items, eq(items.id, itemLinks.item_id))
			.where(eq(items.briefing_date, date))
			.all();
		const withLinks = dayItems.map((i) => ({ ...i, links: links.filter((l) => l.item_id === i.id) }));
		const daySections = db
			.select()
			.from(sections)
			.where(eq(sections.briefing_date, date))
			.orderBy(asc(sections.position))
			.all();
		return {
			...b,
			outage: withLinks.find((i) => i.is_outage),
			sections: daySections
				.filter((s) => s.title !== 'Outages')
				.map((s) => ({ ...s, items: withLinks.filter((i) => !i.is_outage && i.category === s.title) }))
		};
	});
}

export function listOutageChecks(limit: number, offset: number): Page<OutageCheck> {
	return withDb((db) => ({
		rows: db.select().from(outageChecks).orderBy(desc(outageChecks.checked_at)).limit(limit).offset(offset).all(),
		total: db.select({ n: count() }).from(outageChecks).get()?.n ?? 0
	}));
}

/** Newest outage check, used for the header dot and banners. */
export function outageStatus(): { active: boolean; latest: OutageCheck | undefined } {
	return withDb((db) => {
		const latest = db.select().from(outageChecks).orderBy(desc(outageChecks.checked_at)).limit(1).get();
		return { active: !!latest?.is_alert, latest };
	});
}

export function listSources(): Source[] {
	return withDb((db) => db.select().from(sources).orderBy(asc(sources.position)).all());
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
		if (metaValue(db, 'fts') !== '1') {
			const pattern = `%${q}%`;
			return db
				.select({ ...getTableColumns(items), snippet: sql<string>`substr(${items.body}, 1, 200)` })
				.from(items)
				.where(or(like(items.headline, pattern), like(items.body, pattern)))
				.orderBy(desc(items.briefing_date), asc(items.position))
				.limit(limit)
				.all();
		}
		// FTS5 isn't expressible in Drizzle's builder: join the virtual table with raw SQL.
		return db
			.select({ ...getTableColumns(items), snippet: sql<string>`snippet(items_fts, 1, '[[', ']]', '…', 24)` })
			.from(sql`items_fts f`)
			.innerJoin(items, sql`${items.id} = f.rowid`)
			.where(sql`items_fts MATCH ${terms.join(' ')}`)
			.orderBy(sql`bm25(items_fts)`)
			.limit(limit)
			.all();
	});
}
