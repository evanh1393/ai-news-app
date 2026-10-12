import { listBriefings } from '#lib/server/db.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ briefings: listBriefings() });
