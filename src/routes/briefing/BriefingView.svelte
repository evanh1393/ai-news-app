<script lang="ts">
	import type { FullBriefing } from '$lib/server/db';

	let { briefing }: { briefing: FullBriefing } = $props();
</script>

<h2 class="my-1 text-2xl font-bold">{briefing.title}</h2>
{#if briefing.coverage}<div class="text-sm text-base-content/60">{briefing.coverage}</div>{/if}
{#if briefing.intro_html}<div class="prose prose-sm max-w-none text-base-content/60">{@html briefing.intro_html}</div>{/if}

{#if briefing.outage}
	<div role="alert" class="alert alert-soft my-3 block" class:alert-error={briefing.outage_alert}>
		<b>{briefing.outage_alert ? '🚨 OUTAGE ALERT' : '✅ Outages'}:</b>
		<span class="prose prose-sm max-w-none prose-a:text-primary [&_p]:inline">{@html briefing.outage.body_html}</span>
	</div>
{/if}

<div class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-3.5">
	{#each briefing.sections as section (section.position)}
		<section class="card border border-base-300 bg-base-200">
			<div class="card-body p-4">
				<h3 class="card-title text-base">{section.title}</h3>
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
