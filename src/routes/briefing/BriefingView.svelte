<script lang="ts">
	import type { FullBriefing } from '#lib/server/db.js';

	let { briefing }: { briefing: FullBriefing } = $props();
</script>

<div class="mx-auto max-w-3xl">
	<header class="mb-8">
		<h2 class="text-4xl leading-[1.05] text-balance sm:text-5xl">{briefing.title}</h2>
		{#if briefing.coverage}<div class="mt-4 text-sm text-base-content/50">{briefing.coverage}</div>{/if}
		{#if briefing.intro_html}<div class="prose mt-3 max-w-none text-base-content/60">{@html briefing.intro_html}</div>{/if}
	</header>

	{#if briefing.outage}
		<div role="alert" class="alert alert-soft mb-6 block rounded-box px-6 py-4" class:alert-error={briefing.outage_alert} class:bg-base-200={!briefing.outage_alert}>
			<b>{briefing.outage_alert ? '🚨 OUTAGE ALERT' : '✅ Outages'}:</b>
			<span class="prose prose-sm max-w-none prose-a:text-primary [&_p]:inline">{@html briefing.outage.body_html}</span>
		</div>
	{/if}

	{#each briefing.sections as section (section.position)}
		<section class="mt-12 first-of-type:mt-0">
			<div class="mb-5 flex items-baseline justify-between gap-4 border-b border-base-300 pb-3">
				<h3 class="text-2xl leading-tight sm:text-3xl">{section.title}</h3>
				<span class="text-sm text-base-content/50">{section.items.length} {section.items.length === 1 ? 'story' : 'stories'}</span>
			</div>
			{#if section.note_html}<div class="prose prose-sm mb-5 max-w-none text-base-content/60 prose-a:text-primary">{@html section.note_html}</div>{/if}
			<ol class="flex flex-col gap-4">
				{#each section.items as item (item.id)}
					<li
						id="item-{item.position}"
						class="story flex scroll-mt-28 flex-col gap-3 rounded-box border border-base-300 bg-base-200 p-6 transition-colors target:border-primary"
					>
						<span class="text-sm text-base-content/40 tabular-nums">{String(item.position).padStart(2, '0')}</span>
						<div class="prose prose-sm max-w-none sm:prose-base prose-a:text-primary">{@html item.body_html}</div>
					</li>
				{/each}
			</ol>
		</section>
	{/each}
</div>
