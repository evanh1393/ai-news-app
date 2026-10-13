import { error } from '@sveltejs/kit';
import { search } from '#lib/server/db.js';
import type { PageServerLoad } from './$types';

// The site is public (Tailscale Funnel), so bound what one request can make FTS do.
const MAX_CHARS = 200;
const MAX_WORDS = 8;

export const load: PageServerLoad = ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length > MAX_CHARS) error(400, `Searches are limited to ${MAX_CHARS} characters`);
	if (q.split(/\s+/).length > MAX_WORDS) error(400, `Searches are limited to ${MAX_WORDS} words`);
	return { q, hits: q ? search(q) : [] };
};
