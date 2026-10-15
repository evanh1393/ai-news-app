import { apiBriefing } from '#lib/api-shape.js';
import { getBriefing, latestDate } from '#lib/server/db.js';
import { CACHE_SHORT, api, fail, ok } from '#lib/server/api.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = api(() => {
	const date = latestDate();
	const briefing = date && getBriefing(date);
	return briefing ? ok(apiBriefing(briefing), CACHE_SHORT) : fail(404, 'No briefings yet');
});
