// Notes: hand-written posts (tutorials, explainers, whatever's worth sharing) at
// src/routes/notes/<slug>/+page.svelte. Add one here to list it on /notes; notes.test.ts checks each has its page.

/** Tags shown on a note. Add to this list as new kinds of post come along. */
export const TAGS = ['Tutorial'] as const;
export type Tag = (typeof TAGS)[number];

export interface Note {
	slug: string;
	title: string;
	blurb: string;
	tags: Tag[];
	/** When it was written or last reviewed, YYYY-MM-DD. */
	updated: string;
}

/** Newest first. */
export const NOTES: Note[] = [
	{
		slug: 'reading-ai-benchmarks',
		title: 'How to read AI benchmarks',
		blurb: 'The kinds of test behind every launch chart, what each one measures, what to check before trusting a score, and the leaderboards worth following.',
		tags: ['Tutorial'],
		updated: '2026-11-05'
	}
];

export const note = (slug: string) => NOTES.find((n) => n.slug === slug);
