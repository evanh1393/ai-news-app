import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { NOTES } from './notes';

test.each(NOTES.map((n) => n.slug))('note %s has a page', (slug) => {
	expect(existsSync(`src/routes/notes/${slug}/+page.svelte`)).toBe(true);
});

test('slugs are unique and URL-safe', () => {
	const slugs = NOTES.map((n) => n.slug);
	expect(new Set(slugs).size).toBe(slugs.length);
	for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('every note has a tag', () => {
	for (const n of NOTES) expect(n.tags.length).toBeGreaterThan(0);
});
