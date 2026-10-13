<script lang="ts">
	import Pager from '#lib/components/Pager.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Archive · AI Briefing</title></svelte:head>

<h2 class="mb-8 text-4xl leading-none sm:text-5xl">Archive</h2>
<ul class="menu w-full gap-0.5 rounded-box border border-base-300 bg-base-200 p-3">
	{#each data.briefings as b (b.date)}
		<li>
			<a href="/briefing/{b.date}" class="block rounded-field px-4 py-3">
				{b.outage_alert ? '🚨 ' : ''}<span class="font-medium">{b.date}</span>
				<span class="text-sm text-base-content/60">— {b.title} · {b.count} items</span>
			</a>
		</li>
	{:else}
		<li class="p-3">No briefings yet.</li>
	{/each}
</ul>

<Pager page={data.page} pages={data.pages} />
