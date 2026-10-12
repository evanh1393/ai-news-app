<script lang="ts">
	import type { FullBriefing } from '$lib/server/db';

	let { briefing }: { briefing: FullBriefing } = $props();
</script>

<h2 class="title">{briefing.title}</h2>
{#if briefing.coverage}<div class="mu">{briefing.coverage}</div>{/if}
{#if briefing.intro_html}<div class="mu">{@html briefing.intro_html}</div>{/if}

{#if briefing.outage}
	<div class="banner" class:red={briefing.outage_alert}>
		<b>{briefing.outage_alert ? '🚨 OUTAGE ALERT' : '✅ Outages'}:</b>
		{@html briefing.outage.body_html}
	</div>
{/if}

<div class="grid">
	{#each briefing.sections as section (section.position)}
		<section class="card">
			<h3>{section.title}</h3>
			{#if section.note_html}{@html section.note_html}{/if}
			<ol>
				{#each section.items as item (item.id)}
					<li value={item.position} id="item-{item.position}">{@html item.body_html}</li>
				{/each}
			</ol>
		</section>
	{/each}
</div>

<style>
	.title {
		margin: 4px 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 14px;
		margin-top: 14px;
	}
	.card h3 {
		margin: 0 0 8px;
		font-size: 16px;
	}
	ol {
		padding-left: 22px;
		margin: 0;
	}
	li {
		margin: 0 0 9px;
	}
	@media (max-width: 400px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
