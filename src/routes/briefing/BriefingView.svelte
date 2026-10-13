<script lang="ts">
	import type { FullBriefing } from '#lib/server/db.js';

	let { briefing }: { briefing: FullBriefing } = $props();
</script>

<header class="mb-8 max-w-4xl">
	<h2 class="text-4xl leading-[1.05] text-balance sm:text-6xl">{briefing.title}</h2>
	{#if briefing.coverage}<div class="mt-4 text-sm text-base-content/50">{briefing.coverage}</div>{/if}
	{#if briefing.intro_html}<div class="prose mt-3 max-w-none text-base-content/60">{@html briefing.intro_html}</div>{/if}
</header>

{#if briefing.outage}
	<div role="alert" class="alert alert-soft mb-6 block rounded-box px-6 py-4" class:alert-error={briefing.outage_alert} class:bg-base-200={!briefing.outage_alert}>
		<b>{briefing.outage_alert ? '🚨 OUTAGE ALERT' : '✅ Outages'}:</b>
		<span class="prose prose-sm max-w-none prose-a:text-primary [&_p]:inline">{@html briefing.outage.body_html}</span>
	</div>
{/if}

<div class="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-4">
	{#each briefing.sections as section (section.position)}
		<section class="card border border-base-300 bg-base-200">
			<div class="card-body p-6">
				<h3 class="mb-2 text-2xl leading-tight">{section.title}</h3>
				<div class="prose prose-sm max-w-none prose-a:text-primary prose-ol:my-0 prose-li:my-1.5">
					{#if section.note_html}{@html section.note_html}{/if}
					<ol>
						{#each section.items as item (item.id)}
							<li value={item.position} id="item-{item.position}">{@html item.body_html}</li>
						{/each}
					</ol>
				</div>
			</div>
		</section>
	{/each}
</div>
