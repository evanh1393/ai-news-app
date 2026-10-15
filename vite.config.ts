import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

// The commit this build came from, shown in the site footer so a deploy is easy to confirm.
// "-dirty" marks a laptop build with uncommitted changes.
function gitVersion() {
	try {
		const git = (args: string) => execSync(`git ${args}`, { encoding: 'utf8' }).trim();
		return git('rev-parse --short=7 HEAD') + (git('status --porcelain') ? '-dirty' : '');
	} catch {
		return 'unknown';
	}
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter(),
			// Also what /_app/version.json reports and what $app/env's `version` is.
			version: { name: gitVersion() },
			// Vitest (vitest.config.ts) generates its own files: they inline the fixture's BRIEFING_DB, and
			// `npm run dev` hot-reloads .svelte-kit/generated, so sharing it would point dev at the fixture.
			outDir: process.env.VITEST ? '.svelte-kit/vitest' : '.svelte-kit',
			// Public origin behind Cloudflare and Caddy; used for CSRF checks.
			paths: { origin: 'https://eh-ai-blast.app' },
			// Briefing text comes from an LLM summarizing web pages. It's stored as markdown and rendered as
			// Svelte text (no {@html}); this is the backstop: only nonced scripts run, nothing can phone out.
			csp: {
				mode: 'nonce',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'connect-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none']
				}
			}
		})
	]
});
