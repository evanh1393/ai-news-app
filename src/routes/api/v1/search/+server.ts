import { apiHits } from '#lib/api-shape.js';
import { linksFor, search } from '#lib/server/db.js';
import { CACHE_SHORT, api, ok } from '#lib/server/api.js';
import { searchQuery } from '#lib/server/search-query.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = api(({ url }) => {
	const q = searchQuery(url);
	const hits = q ? search(q) : [];
	return ok({ q, hits: apiHits(hits, linksFor(hits.map((h) => h.id))) }, CACHE_SHORT);
});
