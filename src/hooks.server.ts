import type { Handle } from '@sveltejs/kit/hooks';

// Response headers for everything SvelteKit renders. The CSP comes from kit config (vite.config.ts).
// Cloudflare only serves HTTPS (.app requires it), so HSTS is safe. adapter-node serves build/client
// and static/ before this hook runs, so those files don't get them.
export const securityHeaders: Record<string, string> = {
	'strict-transport-security': 'max-age=31536000',
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
	'cross-origin-opener-policy': 'same-origin'
};

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
	return response;
};
