<script lang="ts">
	import { fmtTime } from '#lib/format.js';

	let { data } = $props();
</script>

<svelte:head><title>Outages · AI Briefing</title></svelte:head>

<h2 class="mb-3 text-2xl font-bold">Outages</h2>
<div role="alert" class="alert alert-soft mb-3" class:alert-error={data.active} class:alert-success={!data.active}>
	<span>
		{#if data.active}🚨 <b>Active alert</b>{:else}✅ <b>No active alerts</b>{/if}
		{#if data.latest}<span class="text-sm opacity-70">(last check {fmtTime(data.latest.checked_at)})</span>{/if}
	</span>
</div>

<div class="card border border-base-300 bg-base-200">
	<div class="card-body gap-0 divide-y divide-base-300 p-4">
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
