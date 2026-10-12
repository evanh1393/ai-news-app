<script lang="ts">
	import { fmtTime } from '$lib/format';

	let { data } = $props();
</script>

<svelte:head><title>Outages · AI Briefing</title></svelte:head>

<h2>Outages</h2>
<div class="banner" class:red={data.active}>
	{#if data.active}🚨 <b>Active alert</b>{:else}✅ <b>No active alerts</b>{/if}
	{#if data.latest}<span class="mu">(last check {fmtTime(data.latest.checked_at)})</span>{/if}
</div>

<div class="card">
	{#each data.checks as c (c.id)}
		<div class="entry" class:alert={c.is_alert}>
			<div class="mu">{fmtTime(c.checked_at)}</div>
			{c.text}
		</div>
	{:else}
		<p>No checks logged yet.</p>
	{/each}
</div>

<style>
	.entry {
		padding: 9px 0;
		border-bottom: 1px solid var(--bd);
		white-space: pre-line;
	}
	.entry:last-child {
		border-bottom: none;
	}
	.entry.alert {
		border-left: 3px solid var(--red);
		padding-left: 9px;
	}
</style>
