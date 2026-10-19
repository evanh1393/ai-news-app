// Shapes database rows into /api/v1 responses: plain text only, never markdown or HTML. An item is
// { header, body, links }: header is the headline, body is items.summary (the text after it, with
// citation links dropped), and links are { label, url } data. Pure, so node:test can import it.
import { apiText, inlineTokens } from './inline-md.js';

/**
 * @typedef {{ label: string, url: string }} ApiLink
 * @typedef {{ id: number, position: number, header: string | null, body: string, links: ApiLink[] }} ApiItem
 * @typedef {ApiItem & { date: string, category: string }} ApiHit
 * @typedef {{ id: number, briefing_date: string, category: string, position: number, headline: string | null, summary: string, is_outage: boolean }} ItemRow
 * @typedef {{ item_id: number, label: string, url: string }} LinkRow
 * @typedef {{ date: string, title: string, coverage: string | null, intro_md: string | null, outage_alert: boolean }} BriefingRow
 * @typedef {{ title: string, note_md: string | null }} SectionRow
 * @typedef {{ grp: string, subgroup: string | null, position: number, value_md: string }} SourceRow
 */

/** @param {string | null} md */
const prose = (md) => (md == null ? null : apiText(md, { citations: true }));

/** @param {LinkRow[]} links */
const linkData = (links) => links.map((l) => ({ label: l.label, url: l.url }));

/**
 * The outage item has no headline; it's headed "Outages" (its category).
 * @param {ItemRow} i
 * @param {LinkRow[]} links this item's links
 * @returns {ApiItem}
 */
export const apiItem = (i, links) => ({
	id: i.id,
	position: i.position,
	header: i.headline ?? (i.is_outage ? i.category : null),
	body: i.summary,
	links: linkData(links)
});

/**
 * A row of the briefing list.
 * @param {BriefingRow & { count: number }} b
 */
export const apiBriefingSummary = (b) => ({
	date: b.date,
	title: b.title,
	coverage: b.coverage,
	intro: prose(b.intro_md),
	outage_alert: b.outage_alert,
	count: b.count
});

/**
 * A whole briefing, as getBriefing() returns it.
 * @param {BriefingRow & { outage: (ItemRow & { links: LinkRow[] }) | undefined, sections: (SectionRow & { items: (ItemRow & { links: LinkRow[] })[] })[] }} b
 */
export const apiBriefing = (b) => ({
	date: b.date,
	title: b.title,
	coverage: b.coverage,
	intro: prose(b.intro_md),
	outage_alert: b.outage_alert,
	outage: b.outage ? apiItem(b.outage, b.outage.links) : null,
	sections: b.sections.map((s) => ({
		title: s.title,
		note: prose(s.note_md),
		items: s.items.map((i) => apiItem(i, i.links))
	}))
});

/**
 * Search hits, each with its links (looked up separately; matched by item_id).
 * @param {ItemRow[]} hits
 * @param {LinkRow[]} links
 * @returns {ApiHit[]}
 */
export const apiHits = (hits, links) =>
	hits.map((h) => ({
		date: h.briefing_date,
		category: h.category,
		...apiItem(
			h,
			links.filter((l) => l.item_id === h.id)
		)
	}));

/**
 * A source: its text with link labels kept, and the links as data (a source is often just a link).
 * @param {SourceRow} s
 */
export const apiSource = (s) => ({
	group: s.grp,
	subgroup: s.subgroup,
	position: s.position,
	text: apiText(s.value_md, { citations: true }),
	links: inlineTokens(s.value_md).flatMap((t) => (t.type === 'link' ? [{ label: t.text, url: t.url }] : []))
});
