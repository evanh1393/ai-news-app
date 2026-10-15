import { describe, expect, test } from 'vitest';
import { paginate } from './pagination';
import { expectHttpError } from './test-utils';

const at = (query: string) => new URL(`https://eh-ai-blast.app/archive${query}`);

describe('paginate', () => {
	test('defaults to page 1', () => {
		const p = paginate(at(''), 30);
		expect([p.limit, p.offset]).toEqual([30, 0]);
		expect(p.check(31)).toEqual({ page: 1, pages: 2 });
	});

	test('offsets by whole pages', () => {
		const p = paginate(at('?page=3'), 30);
		expect([p.limit, p.offset]).toEqual([30, 60]);
		expect(p.check(61)).toEqual({ page: 3, pages: 3 });
	});

	test('an empty list still has one page', () => {
		expect(paginate(at('?page=1'), 30).check(0)).toEqual({ page: 1, pages: 1 });
	});

	test.each(['0', '-1', '01', '1.5', 'abc', '', ' 1', '1e3', '9007199254740992'])('400s on page=%j', async (page) => {
		await expectHttpError(() => paginate(at(`?page=${encodeURIComponent(page)}`), 30), 400, /Invalid page/);
	});

	test('404s past the last page, but only once the total is known', async () => {
		const p = paginate(at('?page=3'), 30);
		await expectHttpError(() => p.check(60), 404, /Page not found/);
		await expectHttpError(() => p.check(0), 404);
	});
});
