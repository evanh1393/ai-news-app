// search() when meta.fts isn't '1' (a database from before 0002_fts_flag.sql): a LIKE
// over headline and body. This file gets its own fixture, so the shared one keeps its flag.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test, vi } from 'vitest';
import { buildFixture } from './test-fixture';

const fixture = vi.hoisted(() => ({ file: '' }));
vi.mock('$app/env/private', () => ({ BRIEFING_DB: fixture.file }));

const dir = mkdtempSync(join(tmpdir(), 'briefing-test-nofts-'));
fixture.file = join(dir, 'briefing.db');
buildFixture(fixture.file, { fts: false });
const { search } = await import('./db');
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('search (LIKE fallback)', () => {
	test('matches a substring of headline or body, case-insensitively', () => {
		const [hit, ...rest] = search('CHEAPER');
		expect(rest).toEqual([]);
		expect(hit).toMatchObject({ headline: 'Model X ships' });
		// No highlighting: the first 200 characters of the body.
		expect(hit.snippet).toBe(hit.body.slice(0, 200));
		expect(hit.snippet).not.toContain('[[');
	});

	test('orders newest briefing first, then by position', () => {
		expect(search('model').map((h) => [h.briefing_date, h.headline])).toEqual([
			['2026-10-13', 'Model X ships'],
			['2026-10-13', 'Model Y'],
			['2026-10-11', 'Small model update']
		]);
		expect(search('model', 1)).toHaveLength(1);
	});

	test('matches the query as one phrase, unlike FTS', () => {
		expect(search('open weights').map((h) => h.headline)).toEqual(['Model Y']);
		expect(search('model weights')).toEqual([]);
	});

	test('treats % and _ as literal characters', () => {
		expect(search('%')).toEqual([]);
		expect(search('_')).toEqual([]);
		expect(search('Model_X')).toEqual([]);
		expect(search('Model X').map((h) => h.headline)).toEqual(['Model X ships']);
	});
});
