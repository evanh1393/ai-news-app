// A small briefing database for tests, built the way production builds it: every migration in
// ingest/migrations, then ingest/apply.js writing briefings parsed by ingest/briefing-md.js.
// vitest.config.ts points BRIEFING_DB at a temp file and test-global-setup.ts builds it once per run,
// so any test can import #lib/server/db.js and get this data. Not imported by the app.
import Database from 'better-sqlite3';
import { openWriter } from '../../../ingest/apply.js';
import { parseBriefing } from '../../../ingest/briefing-md.js';
import { parseSources } from '../../../ingest/sources-md.js';

export const BRIEFINGS: Record<string, string> = {
	'2026-10-11': `---
date: 2026-10-11
title: Quiet Saturday
coverage: Oct 10 7:30 AM – Oct 11 7:30 AM ET
outage_alert: false
---

## Outages
- No major outages.

## 🤖 Models & Releases
- **Small model update** — Minor fixes to the tokenizer. [Changelog](https://example.com/changelog)
`,
	'2026-10-12': `---
date: 2026-10-12
title: Chips and courts
outage_alert: true
---

## Outages
- **API errors** at Example Cloud for 40 minutes. [Status](https://status.example.com/)
- Elevated latency on the batch endpoint.

## 💰 Markets & Funding
- **Chipmaker raises $2B** — For new fabs. [Wire](https://wire.example.com/chips)

## ⚖️ Policy
- **Court rules on scraping** — Training on public pages is fair use, for now. [Court](https://court.example.gov/op) [Analysis](https://law.example.com/a)
`,
	'2026-10-13': `---
date: 2026-10-13
title: Big model day
coverage: Oct 12 7:30 AM – Oct 13 7:30 AM ET
outage_alert: false
---

Two launches and a funding round.

## Outages
- No major outages.

## 🤖 Models & Releases
One note.

- **Model X ships** — Faster and cheaper than its predecessor. [Vendor blog](https://example.com/x) [News](https://news.example.com/a)
- **Model Y** — Open weights, Apache licensed. [HF](https://huggingface.co/y)

## 💰 Markets & Funding
- **Startup raises $1B** — Series C for inference chips. [Wire](https://wire.example.com/s)
`
};

export const SOURCES = `# Monitoring Sources

## 1. Web search

- \`AI news <Month DD YYYY>\`

## 2. X

### search_news

- \`AI\`
- \`outage\`

### Accounts watched

- Labs: @OpenAI, @AnthropicAI
`;

/** Rows for outage_checks, which no Drive file feeds yet (src/lib/outages.ts). Newest last. */
export const OUTAGE_CHECKS = [
	{ checked_at: '2026-10-12T08:00:00-04:00', is_alert: 1, text: 'API errors at Example Cloud.' },
	{ checked_at: '2026-10-12T09:00:00-04:00', is_alert: 0, text: 'No alert.' }
];

/** Ingest time stamped on every fixture row. */
export const INGESTED_AT = '2026-10-13T11:40:00.000Z';

/**
 * Build the fixture at `file` (which must not exist yet). `fts` sets meta.fts = '1', which db.ts's
 * search() needs before it uses items_fts; apply.js never sets it, so without it search falls back to LIKE.
 */
export function buildFixture(file: string, { fts = true }: { fts?: boolean } = {}) {
	const db = new Database(file);
	try {
		const w = openWriter(db);
		w.applyAll(
			[
				...Object.entries(BRIEFINGS).map(([date, md]) => ({
					parsed: parseBriefing(md, date),
					file: { name: `briefing-${date}.md`, id: date, md5: date }
				})),
				{ sources: parseSources(SOURCES), file: { name: 'sources.md', id: 's', md5: 's' } }
			],
			INGESTED_AT
		);
		const check = db.prepare('INSERT INTO outage_checks (checked_at, is_alert, text) VALUES (?, ?, ?)');
		for (const c of OUTAGE_CHECKS) check.run(c.checked_at, c.is_alert, c.text);
		if (fts) db.prepare("INSERT INTO meta (key, value) VALUES ('fts', '1')").run();
	} finally {
		db.close();
	}
}
