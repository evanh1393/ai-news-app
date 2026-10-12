import { getBriefing, latestDate } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const date = latestDate();
	return { briefing: date ? getBriefing(date) : undefined };
};
