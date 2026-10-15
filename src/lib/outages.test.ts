import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { OUTAGES_MAINTENANCE } from './outages';

// The README tells people outage checks are paused; keep it honest when the flag flips.
test('README matches OUTAGES_MAINTENANCE', () => {
	const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
	expect(readme.includes('Outage checks are paused (`src/lib/outages.ts`)')).toBe(OUTAGES_MAINTENANCE);
});
