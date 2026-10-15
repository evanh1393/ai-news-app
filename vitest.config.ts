// Tests for the app (src/**/*.test.ts), run through the SvelteKit plugin so $app/*, $types and #lib/*
// resolve as they do in the app. ingest/*.test.js stays on node:test; `npm test` runs both.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// $app/env/private's values are fixed when the plugin resolves the config (dev mode inlines them),
// so BRIEFING_DB has to point at the fixture before that. src/lib/server/test-global-setup.ts builds it.
process.env.BRIEFING_DB = join(mkdtempSync(join(tmpdir(), 'briefing-test-')), 'briefing.db');

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			include: ['src/**/*.test.ts'],
			environment: 'node',
			globalSetup: ['src/lib/server/test-global-setup.ts']
		}
	})
);
