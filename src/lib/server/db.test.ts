// db.ts against the fixture database (test-fixture.ts), which has meta.fts = '1'.
// search-fallback.test.ts covers search() without it.
import { describe, expect, test } from 'vitest';
import { getBriefing, latestDate, listBriefings, listOutageChecks, listSources, outageStatus, search } from './db';
import { INGESTED_AT } from './test-fixture';

describe('listBriefings', () => {
	test('lists newest first, counting news items but not the outage line', () => {
		const { rows, total } = listBriefings(30, 0);
		expect(total).toBe(3);
		expect(rows.map((b) => [b.date, b.count])).toEqual([
			['2026-10-13', 3],
			['2026-10-12', 2],
			['2026-10-11', 1]
		]);
		expect(rows[1]).toMatchObject({ title: 'Chips and courts', coverage: null, outage_alert: true, created_at: INGESTED_AT });
		expect(rows[0]).toMatchObject({ outage_alert: false, intro_md: 'Two launches and a funding round.' });
	});

	test('pages with limit and offset; total stays the full count', () => {
		expect(listBriefings(2, 0).rows.map((b) => b.date)).toEqual(['2026-10-13', '2026-10-12']);
		expect(listBriefings(2, 2)).toMatchObject({ rows: [{ date: '2026-10-11' }], total: 3 });
		expect(listBriefings(2, 4)).toEqual({ rows: [], total: 3 });
	});
});

test('latestDate is the newest briefing', () => {
	expect(latestDate()).toBe('2026-10-13');
});

describe('getBriefing', () => {
	test('returns sections in order with their items and links, minus the Outages section', () => {
		const b = getBriefing('2026-10-13')!;
		expect(b).toMatchObject({ date: '2026-10-13', title: 'Big model day' });
		expect(b.sections.map((s) => [s.position, s.title, s.note_md])).toEqual([
			[1, '🤖 Models & Releases', 'One note.'],
			[2, '💰 Markets & Funding', null]
		]);
		expect(b.sections.map((s) => s.items.map((i) => [i.position, i.headline]))).toEqual([
			[
				[1, 'Model X ships'],
				[2, 'Model Y']
			],
			[[3, 'Startup raises $1B']]
		]);
		const x = b.sections[0].items[0];
		expect(x.links.map((l) => [l.label, l.url])).toEqual([
			['Vendor blog', 'https://example.com/x'],
			['News', 'https://news.example.com/a']
		]);
		expect(x.links.every((l) => l.item_id === x.id)).toBe(true);
		expect(b.sections.flatMap((s) => s.items).some((i) => i.is_outage)).toBe(false);
	});

	test('the outage line comes back separately, with its links', () => {
		const { outage, outage_alert } = getBriefing('2026-10-12')!;
		expect(outage_alert).toBe(true);
		expect(outage).toMatchObject({ is_outage: true, position: 0, headline: null, category: 'Outages' });
		expect(outage!.body_md).toBe('**API errors** at Example Cloud for 40 minutes. [Status](https://status.example.com/)\nElevated latency on the batch endpoint.');
		expect(outage!.links.map((l) => l.url)).toEqual(['https://status.example.com/']);
	});

	test('a section only gets its own items', () => {
		const b = getBriefing('2026-10-12')!;
		expect(b.sections.map((s) => [s.title, s.items.map((i) => i.headline)])).toEqual([
			['💰 Markets & Funding', ['Chipmaker raises $2B']],
			['⚖️ Policy', ['Court rules on scraping']]
		]);
		expect(b.sections[1].items[0].links).toHaveLength(2);
	});

	test('undefined for a date with no briefing', () => {
		expect(getBriefing('2026-10-14')).toBeUndefined();
		expect(getBriefing('not-a-date')).toBeUndefined();
	});
});

test('listSources keeps file order, groups and subgroups', () => {
	expect(listSources().map((s) => [s.position, s.grp, s.subgroup, s.value_md])).toEqual([
		[1, '1. Web search', null, '`AI news <Month DD YYYY>`'],
		[2, '2. X', 'search_news', '`AI`'],
		[3, '2. X', 'search_news', '`outage`'],
		[4, '2. X', 'Accounts watched', 'Labs: @OpenAI, @AnthropicAI']
	]);
});

test('outage checks: newest first, and the newest decides the status', () => {
	expect(listOutageChecks(1, 0)).toMatchObject({ rows: [{ is_alert: false, text: 'No alert.' }], total: 2 });
	expect(listOutageChecks(1, 1).rows[0]).toMatchObject({ is_alert: true });
	expect(outageStatus()).toMatchObject({ active: false, latest: { checked_at: '2026-10-12T09:00:00-04:00' } });
});

describe('search (FTS)', () => {
	const headlines = (q: string) => search(q).map((h) => h.headline);

	test('matches words in headline or body and marks them in the snippet', () => {
		const [hit, ...rest] = search('cheaper');
		expect(rest).toEqual([]);
		expect(hit).toMatchObject({ headline: 'Model X ships', briefing_date: '2026-10-13', position: 1 });
		expect(hit.snippet).toContain('[[cheaper]]');
	});

	test('prefix-matches each word and needs all of them', () => {
		expect(headlines('cheap')).toEqual(['Model X ships']);
		expect(headlines('model').sort()).toEqual(['Model X ships', 'Model Y', 'Small model update']);
		expect(headlines('model weights')).toEqual(['Model Y']);
		expect(headlines('model nothinglikethis')).toEqual([]);
	});

	test('words under 3 characters match whole words only', () => {
		expect(headlines('mo')).toEqual([]);
		expect(headlines('mod').sort()).toEqual(['Model X ships', 'Model Y', 'Small model update']);
		expect(headlines('x')).toEqual(['Model X ships']);
	});

	test('finds outage lines too', () => {
		expect(search('latency')).toMatchObject([{ is_outage: true, briefing_date: '2026-10-12' }]);
	});

	test('quotes and FTS syntax are treated as words, not operators', () => {
		expect(headlines('"cheaper')).toEqual(['Model X ships']);
		expect(headlines('chips OR nothing')).toEqual([]);
		expect(() => search('NEAR( model -x ^y')).not.toThrow();
	});

	test('a blank query finds nothing without touching the database', () => {
		expect(search('   ')).toEqual([]);
		expect(search('""')).toEqual([]);
	});

	test('respects the limit', () => {
		expect(search('model', 2)).toHaveLength(2);
	});
});
