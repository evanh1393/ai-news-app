import { apiSource } from '#lib/api-shape.js';
import { listSources } from '#lib/server/db.js';
import { CACHE_SHORT, api, ok } from '#lib/server/api.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = api(() => ok({ sources: listSources().map(apiSource) }, CACHE_SHORT));
