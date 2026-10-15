import { search } from '#lib/server/db.js';
import { searchQuery } from '#lib/server/search-query.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const q = searchQuery(url);
	return { q, hits: q ? search(q) : [] };
};
