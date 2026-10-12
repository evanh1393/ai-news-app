<script lang="ts">
	let { data } = $props();

	/** Split an FTS snippet ("…[[match]]…") into plain and highlighted parts (no HTML injection). */
	function parts(snippet: string) {
		return snippet.split(/\[\[|\]\]/).map((text, i) => ({ text, hit: i % 2 === 1 }));
	}
</script>

<svelte:head><title>Search · AI Briefing</title></svelte:head>

<h2>Search</h2>
<form method="GET" class="search" data-sveltekit-keepfocus>
	<input name="q" type="search" value={data.q} placeholder="e.g. nvidia, drex, outage" autofocus />
	<button>Search</button>
</form>

{#if data.q}
	<p class="mu">{data.hits.length} result{data.hits.length === 1 ? '' : 's'} for “{data.q}”</p>
	<div class="card list">
		{#each data.hits as h (h.id)}
			<a href="/briefing/{h.briefing_date}#item-{h.position}">
				<span class="mu">{h.briefing_date} · {h.category}</span><br />
				<b>{h.headline ?? h.category}</b><br />
				<span class="snip">
					{#each parts(h.snippet) as p, i (i)}{#if p.hit}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}
				</span>
			</a>
		{:else}
			<p style="padding: 10px 14px">No matches.</p>
		{/each}
	</div>
{/if}

<style>
	.search {
		display: flex;
		gap: 8px;
		margin-bottom: 12px;
	}
	.search input {
		flex: 1;
		padding: 7px 10px;
	}
	.snip {
		font-size: 14px;
	}
	mark {
		background: rgba(210, 153, 34, 0.35);
		color: inherit;
		border-radius: 3px;
	}
</style>
