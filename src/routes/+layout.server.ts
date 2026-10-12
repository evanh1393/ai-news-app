import { outageStatus } from '#lib/server/db.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => outageStatus();
