// The /api/v1 handlers against the fixture database (src/lib/server/test-fixture.ts), called with only
// the event fields they read. Every response is JSON, errors included, and no text is markdown or HTML.
import { describe, expect, test } from 'vitest';
import { fallback as rest } from './[...rest]/+server';
import { GET as list } from './briefings/+server';
import { GET as byDate } from './briefings/[date]/+server';
import { GET as latest } from './briefings/latest/+server';
import { GET as search } from './search/+server';
import { GET as sources } from './sources/+server';

type Handler = (event: never) => Response | Promise<Response>;

/** Call a handler and return its status, Cache-Control and parsed JSON body. */
async function call(handler: Handler, path: string, params: Record<string, string> = {}) {
	const event = { url: new URL(path, 'https://eh-ai-blast.app'), params };
	const res = await (handler as (event: unknown) => Response | Promise<Response>)(event);
	expect(res.headers.get('content-type')).toMatch(/^application\/json/);
	return { status: res.status, cache: res.headers.get('cache-control'), body: await res.json() };
}

/** Every string anywhere in `value`. */
const strings = (value: unknown): string[] =>
	typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

/**
 * Fail if any text in the body looks like markdown or HTML. URLs are data, so they're skipped. Tags are
 * matched lowercase only: sources.md has literal placeholders like "<Month DD YYYY>".
 */
function expectPlain(body: unknown) {
	for (const s of strings(body).filter((s) => !s.startsWith('https://'))) {
		expect(s, s).not.toMatch(/\*\*|\]\(|\[\[|\]\]|`|<\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>|&[a-z]+;/);
	}
}

describe('/api/v1/briefings', () => {
	test('lists briefings newest first, with counts and paging', async () => {
		const { status, cache, body } = await call(list, '/api/v1/briefings');
		expect(status).toBe(200);
		expect(cache).toBe('public, max-age=300');
		expect(body).toMatchObject({ total: 3, page: 1, pages: 1 });
		expect(body.briefings.map((b: { date: string; count: number }) => [b.date, b.count])).toEqual([
			['2026-10-13', 3],
			['2026-10-12', 2],
			['2026-10-11', 1]
		]);
		expect(body.briefings[0]).toEqual({
			date: '2026-10-13',
			title: 'Big model day',
			coverage: 'Oct 12 7:30 AM – Oct 13 7:30 AM ET',
			intro: 'Two launches and a funding round.',
			outage_alert: false,
			count: 3
		});
		expectPlain(body);
	});

	test('a bad or out-of-range page is a JSON error', async () => {
		expect(await call(list, '/api/v1/briefings?page=x')).toEqual({ status: 400, cache: 'no-store', body: { error: 'Invalid page' } });
		expect(await call(list, '/api/v1/briefings?page=2')).toMatchObject({ status: 404, cache: 'no-store' });
	});
});

describe('/api/v1/briefings/[date]', () => {
	test('items are { header, body, links } in plain text', async () => {
		const { status, body } = await call(byDate, '/api/v1/briefings/2026-10-13', { date: '2026-10-13' });
		expect(status).toBe(200);
		expect(body.sections.map((s: { title: string }) => s.title)).toEqual(['🤖 Models & Releases', '💰 Markets & Funding']);
		expect(body.sections[0].note).toBe('One note.');
		expect(body.sections[0].items[0]).toMatchObject({
			header: 'Model X ships',
			body: 'Faster and cheaper than its predecessor.',
			links: [
				{ label: 'Vendor blog', url: 'https://example.com/x' },
				{ label: 'News', url: 'https://news.example.com/a' }
			]
		});
		expect(Object.keys(body.sections[0].items[0]).sort()).toEqual(['body', 'header', 'id', 'links', 'position']);
		expectPlain(body);
	});

	test('the outage line is headed "Outages", with its links', async () => {
		const { body } = await call(byDate, '/api/v1/briefings/2026-10-12', { date: '2026-10-12' });
		expect(body.outage_alert).toBe(true);
		expect(body.outage).toMatchObject({ header: 'Outages', links: [{ label: 'Status', url: 'https://status.example.com/' }] });
		expect(body.outage.body).toContain('API errors at Example Cloud for 40 minutes.');
		expectPlain(body);
	});

	test('a past day is cached for a day, the latest for 5 minutes', async () => {
		expect((await call(byDate, '/x', { date: '2026-10-12' })).cache).toBe('public, max-age=86400');
		expect((await call(byDate, '/x', { date: '2026-10-13' })).cache).toBe('public, max-age=300');
	});

	test('400 for a malformed or impossible date, 404 for a missing day', async () => {
		for (const date of ['oct-13', '2026-02-30', '2026-1-01'])
			expect(await call(byDate, '/x', { date })).toEqual({ status: 400, cache: 'no-store', body: { error: 'Dates are YYYY-MM-DD' } });
		expect(await call(byDate, '/x', { date: '2026-10-14' })).toEqual({
			status: 404,
			cache: 'no-store',
			body: { error: 'No briefing for 2026-10-14' }
		});
	});
});

test('/api/v1/briefings/latest is the newest day', async () => {
	const { status, cache, body } = await call(latest, '/api/v1/briefings/latest');
	expect(status).toBe(200);
	expect(cache).toBe('public, max-age=300');
	expect(body).toMatchObject({ date: '2026-10-13', title: 'Big model day' });
	expectPlain(body);
});

describe('/api/v1/search', () => {
	test('hits are items with their date, category and links, without the marked snippet', async () => {
		const { status, body } = await call(search, '/api/v1/search?q=cheaper');
		expect(status).toBe(200);
		expect(body.q).toBe('cheaper');
		expect(body.hits).toHaveLength(1);
		expect(body.hits[0]).toMatchObject({
			date: '2026-10-13',
			category: '🤖 Models & Releases',
			header: 'Model X ships',
			body: 'Faster and cheaper than its predecessor.',
			links: [{ label: 'Vendor blog' }, { label: 'News' }]
		});
		expect(body.hits[0]).not.toHaveProperty('snippet');
		expectPlain(body);
	});

	test('an empty query returns no hits', async () => {
		expect((await call(search, '/api/v1/search?q=')).body).toEqual({ q: '', hits: [] });
	});

	test('the /search limits apply, as JSON errors', async () => {
		const words = await call(search, `/api/v1/search?q=${'a '.repeat(9)}`);
		expect(words).toEqual({ status: 400, cache: 'no-store', body: { error: 'Searches are limited to 8 words' } });
		const chars = await call(search, `/api/v1/search?q=${'a'.repeat(201)}`);
		expect(chars).toEqual({ status: 400, cache: 'no-store', body: { error: 'Searches are limited to 200 characters' } });
	});
});

test('/api/v1/sources is plain text in order', async () => {
	const { status, body } = await call(sources, '/api/v1/sources');
	expect(status).toBe(200);
	expect(body.sources.length).toBeGreaterThan(0);
	expect(body.sources.map((s: { position: number }) => s.position)).toEqual(body.sources.map((_: unknown, i: number) => i + 1));
	expect(body.sources[0]).not.toHaveProperty('value_md');
	expectPlain(body);
});

test('unknown /api/v1 paths are a JSON 404', async () => {
	expect(await call(rest, '/api/v1/nope', { rest: 'nope' })).toEqual({ status: 404, cache: 'no-store', body: { error: 'Not found' } });
});
