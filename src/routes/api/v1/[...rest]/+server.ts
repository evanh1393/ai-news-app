import { fail } from '#lib/server/api.js';
import type { RequestHandler } from './$types';

// Unknown API paths get a JSON 404 rather than the site's HTML error page.
export const fallback: RequestHandler = () => fail(404, 'Not found');
