import { error } from '@sveltejs/kit';
import { getBriefing } from '#lib/server/db.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const briefing = getBriefing(params.date);
	if (!briefing) error(404, `No briefing for ${params.date}`);
	return { briefing };
};
