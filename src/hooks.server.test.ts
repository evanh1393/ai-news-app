// The security headers from the handle hook, on a page, a JSON response and an error.
import { describe, expect, test } from 'vitest';
import { handle, securityHeaders } from './hooks.server';

type Input = Parameters<typeof handle>[0];

/** Run the hook with `resolve` returning `response`, and return the headers it sends. */
async function headersFor(response: Response) {
	const event = { url: new URL('https://eh-ai-blast.app/') } as Input['event'];
	return (await handle({ event, resolve: async () => response })).headers;
}

describe('handle', () => {
	test.each([
		['a page', new Response('<p>hi</p>', { headers: { 'content-type': 'text/html' } })],
		['JSON', Response.json({ ok: true })],
		['an error', new Response('nope', { status: 500 })]
	])('sets the security headers on %s', async (_, response) => {
		const headers = await headersFor(response);
		for (const [name, value] of Object.entries(securityHeaders)) expect(headers.get(name), name).toBe(value);
	});

	test('keeps headers the route set', async () => {
		const headers = await headersFor(
			new Response('', { headers: { 'cache-control': 'public, max-age=300', 'content-security-policy': "default-src 'self'" } })
		);
		expect(headers.get('cache-control')).toBe('public, max-age=300');
		expect(headers.get('content-security-policy')).toBe("default-src 'self'");
	});
});
