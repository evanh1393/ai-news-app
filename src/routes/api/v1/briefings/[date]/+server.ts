import { getBriefing, latestDate } from '#lib/server/db.js';
import { CACHE_PAST, CACHE_SHORT, api, fail, isDate, ok } from '#lib/server/api.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = api(({ params }) => {
	if (!isDate(params.date)) return fail(400, 'Dates are YYYY-MM-DD');
	const briefing = getBriefing(params.date);
	if (!briefing) return fail(404, `No briefing for ${params.date}`);
	// The newest day can still be re-pulled; older ones are settled.
	return ok(briefing, params.date === latestDate() ? CACHE_SHORT : CACHE_PAST);
});
