// Shared helpers for vitest files under src/. Not imported by the app.
import { isHttpError } from '@sveltejs/kit';
import { expect } from 'vitest';

/** Await `fn` and check it throws SvelteKit's error(status, …), with a body message matching `message`. */
export async function expectHttpError(fn: () => unknown, status: number, message?: RegExp) {
	let thrown: unknown;
	try {
		await fn();
	} catch (e) {
		thrown = e;
	}
	expect(isHttpError(thrown), `expected error(${status}), got ${String(thrown)}`).toBe(true);
	if (!isHttpError(thrown)) return;
	expect(thrown.status).toBe(status);
	if (message) expect(thrown.body.message).toMatch(message);
}

/**
 * Call a route's `load` with only the event fields it reads (url, params). The loaders here only
 * touch those, so a test fails loudly (undefined property) if one starts reading more.
 */
export async function callLoad(
	load: (event: never) => unknown,
	path: string,
	params: Record<string, string> = {}
): Promise<Record<string, any>> {
	const event = { url: new URL(path, 'https://eh-ai-blast.app'), params };
	return (await (load as (event: unknown) => unknown)(event)) as Record<string, any>;
}
