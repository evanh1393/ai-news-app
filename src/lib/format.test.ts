import { describe, expect, test } from 'vitest';
import { fmtTime } from './format';

// ICU puts a narrow no-break space before AM/PM; compare with plain spaces.
const fmt = (iso: string | undefined) => fmtTime(iso).replace(/\s/g, ' ');

describe('fmtTime', () => {
	test('formats a New York time as is', () => {
		expect(fmt('2026-10-10T22:00:00-04:00')).toBe('Oct 10, 10:00 PM ET');
	});

	test('converts other offsets to New York, across DST', () => {
		expect(fmt('2026-10-11T02:00:00Z')).toBe('Oct 10, 10:00 PM ET'); // EDT, UTC-4
		expect(fmt('2026-12-01T15:05:00Z')).toBe('Dec 1, 10:05 AM ET'); // EST, UTC-5
	});

	test('empty or missing input is an empty string', () => {
		expect(fmtTime(undefined)).toBe('');
		expect(fmtTime('')).toBe('');
	});
});
