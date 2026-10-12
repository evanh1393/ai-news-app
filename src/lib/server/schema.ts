// Drizzle tables for /opt/ai-briefing/data/briefing.db. Grok Bot owns the schema (see the README on
// CT 101); this file only describes it for typed reads. Never generate or run migrations against it.
// items_fts (FTS5) isn't modelled; search() queries it with raw SQL.
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const briefings = sqliteTable('briefings', {
	date: text('date').primaryKey(),
	title: text('title').notNull(),
	coverage: text('coverage'),
	intro_html: text('intro_html'),
	outage_alert: integer('outage_alert', { mode: 'boolean' }).notNull(),
	created_at: text('created_at').notNull()
});

export const sections = sqliteTable('sections', {
	briefing_date: text('briefing_date').notNull(),
	position: integer('position').notNull(),
	title: text('title').notNull(),
	note_html: text('note_html')
});

export const items = sqliteTable('items', {
	id: integer('id').primaryKey(),
	briefing_date: text('briefing_date').notNull(),
	category: text('category').notNull(),
	position: integer('position').notNull(),
	headline: text('headline'),
	body: text('body').notNull(),
	body_html: text('body_html').notNull(),
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
	value: text('value').notNull(),
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
