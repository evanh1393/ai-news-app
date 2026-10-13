import { listBriefings } from '#lib/server/db.js';
import { paginate } from '#lib/pagination.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const p = paginate(url, 30);
	const { rows, total } = listBriefings(p.limit, p.offset);
	return { briefings: rows, ...p.check(total) };
};
