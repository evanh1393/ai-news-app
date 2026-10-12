<script lang="ts">
	import Pager from '#lib/components/Pager.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Archive · AI Briefing</title></svelte:head>

<h2 class="mb-3 text-2xl font-bold">Archive</h2>
<ul class="menu w-full rounded-box border border-base-300 bg-base-200">
	{#each data.briefings as b (b.date)}
		<li>
			<a href="/briefing/{b.date}" class="block">
				{b.outage_alert ? '🚨 ' : ''}<b>{b.date}</b>
				<span class="text-sm text-base-content/60">— {b.title} · {b.count} items</span>
			</a>
		</li>
	{:else}
		<li class="p-3">No briefings yet.</li>
	{/each}
</ul>

<Pager page={data.page} pages={data.pages} />
