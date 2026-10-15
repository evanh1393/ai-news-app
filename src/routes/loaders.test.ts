// Route loaders against the fixture database (src/lib/server/test-fixture.ts), called with only the
// event fields they read.
import { describe, expect, test } from 'vitest';
import { callLoad, expectHttpError } from '#lib/test-utils.js';
import { load as layout } from './+layout.server';
import { load as home } from './+page.server';
import { load as archive } from './archive/+page.server';
import { load as briefing } from './briefing/[date]/+page.server';
import { load as outages } from './outages/+page.server';
import { load as searchPage } from './search/+page.server';
import { load as sources } from './sources/+page.server';

test('layout: outage status from the newest check', async () => {
	expect(await callLoad(layout, '/')).toMatchObject({ active: false, latest: { text: 'No alert.' } });
});

test('home: the latest briefing', async () => {
	const data = await callLoad(home, '/');
	expect(data.briefing).toMatchObject({ date: '2026-10-13', title: 'Big model day' });
});

describe('briefing/[date]', () => {
	test('loads the day', async () => {
		const data = await callLoad(briefing, '/briefing/2026-10-12', { date: '2026-10-12' });
		expect(data.briefing.sections.map((s: { title: string }) => s.title)).toEqual(['💰 Markets & Funding', '⚖️ Policy']);
	});

	test('404s for a day with no briefing', async () => {
		await expectHttpError(() => callLoad(briefing, '/briefing/2026-10-14', { date: '2026-10-14' }), 404, /No briefing for 2026-10-14/);
	});
});

describe('archive', () => {
	test('page 1 lists every briefing', async () => {
		const data = await callLoad(archive, '/archive');
		expect(data).toMatchObject({ page: 1, pages: 1 });
		expect(data.briefings.map((b: { date: string; count: number }) => [b.date, b.count])).toEqual([
			['2026-10-13', 3],
			['2026-10-12', 2],
			['2026-10-11', 1]
		]);
	});

	test('404s past the last page', async () => {
		await expectHttpError(() => callLoad(archive, '/archive?page=2'), 404);
	});

	test.each(['0', '-1', 'two', '1.0', '99999999999999999999'])('400s on page=%s', async (page) => {
		await expectHttpError(() => callLoad(archive, `/archive?page=${page}`), 400);
	});
});

describe('outages', () => {
	test('lists checks, newest first', async () => {
		const data = await callLoad(outages, '/outages');
		expect(data).toMatchObject({ page: 1, pages: 1 });
		expect(data.checks.map((c: { is_alert: boolean }) => c.is_alert)).toEqual([false, true]);
	});

	test('404s past the last page', async () => {
		await expectHttpError(() => callLoad(outages, '/outages?page=2'), 404);
	});
});

test('sources: grouped by heading, then subheading, in file order', async () => {
	expect((await callLoad(sources, '/sources')).groups).toEqual([
		{ grp: '1. Web search', subs: [{ subgroup: null, values: ['`AI news <Month DD YYYY>`'] }] },
		{
			grp: '2. X',
			subs: [
				{ subgroup: 'search_news', values: ['`AI`', '`outage`'] },
				{ subgroup: 'Accounts watched', values: ['Labs: @OpenAI, @AnthropicAI'] }
			]
		}
	]);
});

describe('search', () => {
	const q = (query: string) => callLoad(searchPage, `/search?q=${encodeURIComponent(query)}`);

	test('no query, no hits', async () => {
		expect(await callLoad(searchPage, '/search')).toEqual({ q: '', hits: [] });
		expect(await q('   ')).toEqual({ q: '', hits: [] });
	});

	test('trims the query and returns hits', async () => {
		const data = await q('  cheaper ');
		expect(data.q).toBe('cheaper');
		expect(data.hits.map((h: { headline: string }) => h.headline)).toEqual(['Model X ships']);
	});

	test('allows up to 200 characters and 8 words', async () => {
		await expect(q('x'.repeat(200))).resolves.toMatchObject({ hits: [] });
		await expect(q('a b c d e f g h')).resolves.toMatchObject({ hits: [] });
	});

	test('400s over 200 characters', async () => {
		await expectHttpError(() => q('x'.repeat(201)), 400, /200 characters/);
	});

	test('400s over 8 words', async () => {
		await expectHttpError(() => q('a b c d e f g h i'), 400, /8 words/);
	});

	test('counts words after trimming, however they are spaced', async () => {
		await expect(q('  a  b\tc\nd e f g h  ')).resolves.toMatchObject({ q: 'a  b\tc\nd e f g h' });
	});
});
