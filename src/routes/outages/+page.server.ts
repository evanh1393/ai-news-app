import { listOutageChecks } from '#lib/server/db.js';
import { paginate } from '#lib/pagination.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const p = paginate(url, 50);
	const { rows, total } = listOutageChecks(p.limit, p.offset);
	return { checks: rows, ...p.check(total) };
};
