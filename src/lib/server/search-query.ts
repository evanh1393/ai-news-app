import { error } from '@sveltejs/kit';

// The site is public, so bound what one request can make FTS do. Shared by /search and
// /api/v1/search; Cloudflare also rate-limits both per IP (infra/cloudflare.tf).
export const MAX_CHARS = 200;
export const MAX_WORDS = 8;

/** The trimmed `?q=` param, or a 400 if it's over the limits. Empty means no search. */
export function searchQuery(url: URL): string {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length > MAX_CHARS) error(400, `Searches are limited to ${MAX_CHARS} characters`);
	if (q.split(/\s+/).length > MAX_WORDS) error(400, `Searches are limited to ${MAX_WORDS} words`);
	return q;
}
