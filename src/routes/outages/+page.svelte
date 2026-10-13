<script lang="ts">
	import Pager from '#lib/components/Pager.svelte';
	import { fmtTime } from '#lib/format.js';
	import { OUTAGES_MAINTENANCE } from '#lib/outages.js';

	let { data } = $props();
</script>

<svelte:head><title>Outages · AI Briefing</title></svelte:head>

<h2 class="mb-8 text-4xl leading-none sm:text-5xl">Outages</h2>
{#if OUTAGES_MAINTENANCE}
	<div role="alert" class="alert alert-soft alert-warning mb-4 rounded-box px-6 py-4">
		<span>
			🛠️ <b>Outage checks are under maintenance.</b> Live status is paused; the log below is history only.
			{#if data.latest}<span class="text-sm opacity-70">(last check {fmtTime(data.latest.checked_at)})</span>{/if}
		</span>
	</div>
{:else}
	<div role="alert" class="alert alert-soft mb-4 rounded-box px-6 py-4" class:alert-error={data.active} class:bg-base-200={!data.active}>
		<span>
			{#if data.active}🚨 <b>Active alert</b>{:else}✅ <b>No active alerts</b>{/if}
			{#if data.latest}<span class="text-sm opacity-70">(last check {fmtTime(data.latest.checked_at)})</span>{/if}
		</span>
	</div>
{/if}

<div class="card border border-base-300 bg-base-200">
	<div class="card-body gap-0 divide-y divide-base-300 px-6 py-3">
		{#each data.checks as c (c.id)}
			<div class="py-2 whitespace-pre-line" class:border-l-4={c.is_alert} class:border-l-error={c.is_alert} class:pl-3={c.is_alert}>
				<div class="text-sm text-base-content/60">{fmtTime(c.checked_at)}</div>
				{c.text}
			</div>
		{:else}
			<p>No checks logged yet.</p>
		{/each}
	</div>
</div>

<Pager page={data.page} pages={data.pages} />
