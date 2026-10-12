import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	BRIEFING_DB: {
		description: "Path to Grok Bot's SQLite database (read-only).",
		schema: (value) => value || '/opt/ai-briefing/data/briefing.db'
	}
});
