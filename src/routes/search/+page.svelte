<script lang="ts">
	let { data } = $props();

	/** Split an FTS snippet ("…[[match]]…") into plain and highlighted parts (no HTML injection). */
	function parts(snippet: string) {
		return snippet.split(/\[\[|\]\]/).map((text, i) => ({ text, hit: i % 2 === 1 }));
	}
</script>

<svelte:head><title>Search · AI Briefing</title></svelte:head>

<h2 class="mb-3 text-2xl font-bold">Search</h2>
<form method="GET" class="join mb-3 flex" data-sveltekit-reset="false">
	<input class="input join-item flex-1" name="q" type="search" value={data.q} placeholder="e.g. nvidia, drex, outage" autofocus />
	<button class="btn btn-primary join-item">Search</button>
</form>

{#if data.q}
	<p class="mb-2 text-sm text-base-content/60">{data.hits.length} result{data.hits.length === 1 ? '' : 's'} for “{data.q}”</p>
	<ul class="menu w-full rounded-box border border-base-300 bg-base-200">
		{#each data.hits as h (h.id)}
			<li>
				<a href="/briefing/{h.briefing_date}#item-{h.position}" class="block">
					<span class="text-sm text-base-content/60">{h.briefing_date} · {h.category}</span><br />
					<b>{h.headline ?? h.category}</b><br />
					<span class="text-sm">
						{#each parts(h.snippet) as p, i (i)}{#if p.hit}<mark class="rounded-sm bg-warning/35 text-inherit">{p.text}</mark>{:else}{p.text}{/if}{/each}
					</span>
				</a>
			</li>
		{:else}
			<li class="p-3">No matches.</li>
		{/each}
	</ul>
{/if}
