<script lang="ts">
	import type { Snippet } from 'svelte';
	import { note } from '#lib/notes.js';
	import Tag from './Tag.svelte';

	// Shared frame for a note: back link and tags, then the title and blurb from NOTES. The page lays out its own body.
	let { slug, children }: { slug: string; children: Snippet } = $props();
	const n = $derived(note(slug)!);
</script>

<svelte:head><title>{n.title} · AI Morning Briefing</title></svelte:head>

<article>
	<header class="intro mb-12 max-w-3xl sm:mb-16">
		<div class="flex flex-wrap items-center gap-3">
			<a class="text-sm text-base-content/50 transition-colors hover:text-base-content" href="/notes">← All notes</a>
			{#each n.tags as t (t)}<Tag tag={t} />{/each}
		</div>
		<h2 class="mt-5 font-serif text-5xl leading-[1.05] tracking-normal text-balance italic sm:text-6xl">{n.title}</h2>
		<p class="mt-4 text-lg text-pretty text-base-content/60">{n.blurb}</p>
	</header>

	{@render children()}

	<p class="mt-20 text-sm text-base-content/40">Updated {n.updated}</p>
</article>
