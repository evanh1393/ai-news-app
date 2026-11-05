<script lang="ts">
	import Tag from '#lib/components/Tag.svelte';
	import { NOTES } from '#lib/notes.js';
</script>

<svelte:head><title>Notes · AI Morning Briefing</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<header class="intro mb-8">
		<h2 class="text-4xl leading-[1.05] sm:text-5xl">Notes</h2>
		<p class="mt-4 text-lg text-pretty text-base-content/60">Tutorials, explainers and other things worth a closer look, beyond the daily briefing.</p>
	</header>

	<ul class="flex flex-col gap-4">
		{#each NOTES as n (n.slug)}
			<li class="reveal">
				<a
					class="group block rounded-md border border-base-300/60 bg-base-200/50 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-base-content/30 sm:p-8"
					href="/notes/{n.slug}"
				>
					<span class="flex flex-wrap items-center justify-between gap-3">
						<span class="flex flex-wrap gap-2">{#each n.tags as t (t)}<Tag tag={t} />{/each}</span>
						<span class="text-sm text-base-content/40 tabular-nums">{n.updated}</span>
					</span>
					<h3 class="mt-4 text-xl font-medium">{n.title}</h3>
					<p class="mt-2 text-pretty text-base-content/60">{n.blurb}</p>
				</a>
			</li>
		{/each}
	</ul>
</div>
