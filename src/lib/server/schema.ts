// Drizzle tables for /opt/ai-briefing/data/briefing.db. The schema lives in ingest/migrations/*.sql;
// this file only mirrors it for typed reads, so update it alongside each migration and never generate
// or run Drizzle migrations against it. *_md columns hold inline markdown (src/lib/inline-md.js);
// the rest is plain text.
// items_fts (FTS5) and drive_files aren't modelled; search() queries items_fts with raw SQL.
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const briefings = sqliteTable('briefings', {
	date: text('date').primaryKey(),
	title: text('title').notNull(),
	coverage: text('coverage'),
	intro_md: text('intro_md'),
	outage_alert: integer('outage_alert', { mode: 'boolean' }).notNull(),
	created_at: text('created_at').notNull()
});

export const sections = sqliteTable('sections', {
	briefing_date: text('briefing_date').notNull(),
	position: integer('position').notNull(),
	title: text('title').notNull(),
	note_md: text('note_md')
});

export const items = sqliteTable('items', {
	id: integer('id').primaryKey(),
	briefing_date: text('briefing_date').notNull(),
	category: text('category').notNull(),
	position: integer('position').notNull(),
	headline: text('headline'), // plain; null for the outage item
	body: text('body').notNull(), // the whole item incl. headline and link labels, plain, for search
	summary: text('summary').notNull(), // the text after the headline, plain, no citation links: the API's body
	body_md: text('body_md').notNull(), // the source line(s), what the site renders
	is_outage: integer('is_outage', { mode: 'boolean' }).notNull()
});

export const itemLinks = sqliteTable('item_links', {
	item_id: integer('item_id').notNull(),
	label: text('label').notNull(),
	url: text('url').notNull()
});

export const outageChecks = sqliteTable('outage_checks', {
	id: integer('id').primaryKey(),
	checked_at: text('checked_at').notNull(),
	is_alert: integer('is_alert', { mode: 'boolean' }).notNull(),
	text: text('text').notNull()
});

export const sources = sqliteTable('sources', {
	id: integer('id').primaryKey(),
	grp: text('grp').notNull(),
	subgroup: text('subgroup'),
	position: integer('position').notNull(),
	value_md: text('value_md').notNull(),
	note: text('note')
});

export const meta = sqliteTable('meta', {
	key: text('key').primaryKey(),
	value: text('value')
});

export type Briefing = typeof briefings.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Link = typeof itemLinks.$inferSelect;
export type OutageCheck = typeof outageChecks.$inferSelect;
export type Source = typeof sources.$inferSelect;
