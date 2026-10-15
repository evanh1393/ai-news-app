<script lang="ts">
	import Markdown from '#lib/components/Markdown.svelte';
	import { plainText } from '#lib/inline-md.js';
	import type { FullBriefing } from '#lib/server/db.js';

	let { briefing }: { briefing: FullBriefing } = $props();

	// The card as plain text with its link URLs, dated so a chatbot knows when the story ran.
	let copied = $state<number | null>(null);
	async function copy(item: FullBriefing['sections'][number]['items'][number]) {
		await navigator.clipboard.writeText(`${plainText(item.body_md)}\n\n(From the AI briefing for ${briefing.date})`);
		copied = item.id;
		setTimeout(() => copied === item.id && (copied = null), 2000);
	}
</script>

<div class="mx-auto max-w-5xl">
	<header class="intro mb-8 max-w-3xl">
		<h2 class="font-serif text-5xl leading-[1.05] tracking-normal text-balance italic sm:text-6xl">The AI news, minus the noise.</h2>
		<p class="mt-4 text-lg text-pretty text-base-content/60">
			A briefing curated by AI, about AI. Each morning an agent combs through <a class="text-base-content underline underline-offset-4" href="/sources">our sources</a>, keeps the stories that
			matter, and boils each one down to a few lines. Read it in a few minutes and you're caught up on
			what happened in AI.
		</p>
		<p class="mt-4 border-l-2 border-primary/60 pl-3 text-pretty text-base-content/80">
			<span class="font-medium text-base-content">Want to learn more?</span> Copy one of our briefing cards and paste it into a chatbot of your choosing to dig into the story.
		</p>
	</header>

	{#if briefing.outage}
		<div
			role="alert"
			class="alert alert-soft mb-6 block rounded-md px-6 py-4 backdrop-blur-sm {briefing.outage_alert ? 'alert-error' : 'border-base-300/60 bg-base-200/50'}"
		>
			<b>{briefing.outage_alert ? '🚨 OUTAGE ALERT' : '✅ Outages'}:</b>
			<span class="prose prose-sm max-w-none prose-a:text-primary [&_p]:inline"><Markdown md={briefing.outage.body_md} /></span>
		</div>
	{/if}

	{#each briefing.sections as section (section.position)}
		<section class="mt-12 first-of-type:mt-0">
			<div class="mb-5 flex items-baseline justify-between gap-4 border-b border-base-300 pb-3">
				<h3 class="text-2xl leading-tight sm:text-3xl">{section.title}</h3>
				<span class="text-sm text-base-content/50">{section.items.length} {section.items.length === 1 ? 'story' : 'stories'}</span>
			</div>
			{#if section.note_md}<div class="prose prose-sm mb-5 max-w-none text-base-content/60 prose-a:text-primary"><Markdown md={section.note_md} paragraphs /></div>{/if}
			<ol class="grid gap-4 md:grid-cols-2">
				{#each section.items as item (item.id)}
					<li
						id="item-{item.position}"
						class="story flex scroll-mt-28 flex-col gap-3 rounded-md border border-base-300/60 bg-base-200/50 p-6 backdrop-blur-sm transition-colors hover:bg-base-200/80 target:border-primary"
					>
						<div class="flex items-center justify-between">
							<span class="text-sm text-base-content/40 tabular-nums">{String(item.position).padStart(2, '0')}</span>
							<button type="button" class="btn btn-ghost btn-xs text-base-content/50" onclick={() => copy(item)}>
								{copied === item.id ? 'Copied' : 'Copy'}
							</button>
						</div>
						<div class="prose prose-sm max-w-none sm:prose-base prose-a:text-primary"><Markdown md={item.body_md} /></div>
					</li>
				{/each}
			</ol>
		</section>
	{/each}
</div>
