// Vitest globalSetup: builds the fixture database at BRIEFING_DB (set in vitest.config.ts) before
// any test file loads, and removes it afterwards.
import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildFixture } from './test-fixture';

export default function setup() {
	const file = process.env.BRIEFING_DB;
	if (!file) throw new Error('BRIEFING_DB is not set; run the tests through vitest.config.ts');
	mkdirSync(dirname(file), { recursive: true });
	rmSync(file, { force: true }); // a rerun in watch mode builds it again
	buildFixture(file);
	return () => rmSync(dirname(file), { recursive: true, force: true });
}
