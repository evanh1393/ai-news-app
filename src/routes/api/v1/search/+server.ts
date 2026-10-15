import { search } from '#lib/server/db.js';
import { CACHE_SHORT, api, ok } from '#lib/server/api.js';
import { searchQuery } from '#lib/server/search-query.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = api(({ url }) => {
	const q = searchQuery(url);
	return ok({ q, hits: q ? search(q) : [] }, CACHE_SHORT);
});
