import { listBriefings } from '#lib/server/db.js';
import { CACHE_SHORT, api, briefingPage, ok } from '#lib/server/api.js';
import { paginate } from '#lib/pagination.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = api(({ url }) => {
	const p = paginate(url, 30);
	const page = listBriefings(p.limit, p.offset);
	return ok(briefingPage(page, p.check(page.total)), CACHE_SHORT);
});
