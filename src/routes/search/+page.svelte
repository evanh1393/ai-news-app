<script lang="ts">
	let { data } = $props();

	/** Split an FTS snippet ("…[[match]]…") into plain and highlighted parts (no HTML injection). */
	function parts(snippet: string) {
		return snippet.split(/\[\[|\]\]/).map((text, i) => ({ text, hit: i % 2 === 1 }));
	}
</script>

<svelte:head><title>Search · AI Briefing</title></svelte:head>

<h2 class="mb-8 text-4xl leading-none sm:text-5xl">Search</h2>
<form method="GET" class="mb-6 flex gap-2" data-sveltekit-reset="false">
	<input class="input input-lg flex-1 bg-base-200" name="q" type="search" value={data.q} placeholder="e.g. nvidia, drex, outage" autofocus />
	<button class="btn btn-primary btn-lg px-6">Search</button>
</form>

{#if data.q}
	<p class="mb-2 text-sm text-base-content/60">{data.hits.length} result{data.hits.length === 1 ? '' : 's'} for “{data.q}”</p>
	<ul class="menu w-full gap-0.5 rounded-box border border-base-300 bg-base-200 p-3">
		{#each data.hits as h (h.id)}
			<li>
				<a href="/briefing/{h.briefing_date}#item-{h.position}" class="block rounded-field px-4 py-3">
					<span class="text-sm text-base-content/60">{h.briefing_date} · {h.category}</span><br />
					<span class="font-medium">{h.headline ?? h.category}</span><br />
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
