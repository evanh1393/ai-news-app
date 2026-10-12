import { listSources } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	// Group rows by heading, then subheading, preserving order.
	const groups: { grp: string; subs: { subgroup: string | null; values: string[] }[] }[] = [];
	for (const s of listSources()) {
		let g = groups.at(-1);
		if (g?.grp !== s.grp) groups.push((g = { grp: s.grp, subs: [] }));
		let sub = g.subs.at(-1);
		if (!sub || sub.subgroup !== s.subgroup) g.subs.push((sub = { subgroup: s.subgroup, values: [] }));
		sub.values.push(s.value);
	}
	return { groups };
};
