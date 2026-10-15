// Helpers for the read-only JSON API under /api/v1. Rows go out as stored: markdown fields (*_md,
// body) stay markdown, never HTML.
import { isHttpError, json, type RequestEvent } from '@sveltejs/kit';
import type { BriefingSummary, Page } from './db';

// briefing-pull adds a day's briefing hourly and re-ingests a file Grok Bot rewrites, so only an
// older day is stable. A day is long enough for that, and short enough to pick up a rare rewrite.
export const CACHE_PAST = 'public, max-age=86400';
// Latest, lists, search and sources change on the next pull (hourly at :10).
export const CACHE_SHORT = 'public, max-age=300';

export const ok = (body: unknown, cacheControl: string) => json(body, { headers: { 'cache-control': cacheControl } });

export const fail = (status: number, message: string) =>
	json({ error: message }, { status, headers: { 'cache-control': 'no-store' } });

/**
 * Wrap a GET handler so every error is `{ "error": "..." }` JSON. SvelteKit answers an `error()`
 * thrown from +server.ts with `{ "message": ... }` only when Accept prefers JSON, and with the HTML
 * error page otherwise (a browser, say).
 */
export function api<E extends RequestEvent>(fn: (event: E) => Response) {
	return (event: E): Response => {
		try {
			return fn(event);
		} catch (e) {
			if (isHttpError(e)) return fail(e.status, e.body.message);
			console.error(e);
			return fail(500, 'Internal Error');
		}
	};
}

/** A real calendar date written YYYY-MM-DD. */
export function isDate(s: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s);
}

/** One page of the briefing list. */
export const briefingPage = ({ rows, total }: Page<BriefingSummary>, info: { page: number; pages: number }) => ({
	briefings: rows,
	total,
	...info
});
