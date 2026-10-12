<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Archive · AI Briefing</title></svelte:head>

<h2>Archive</h2>
<div class="card list">
	{#each data.briefings as b (b.date)}
		<a href="/briefing/{b.date}">
			{b.outage_alert ? '🚨 ' : ''}<b>{b.date}</b>
			<span class="mu">— {b.title} · {b.count} items</span>
		</a>
	{:else}
		<p style="padding: 10px 14px">No briefings yet.</p>
	{/each}
</div>
