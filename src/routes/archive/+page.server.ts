import { listBriefings } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ briefings: listBriefings() });
