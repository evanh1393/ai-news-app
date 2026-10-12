<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Sources · AI Briefing</title></svelte:head>

<h2>Sources</h2>
<div class="card">
	{#each data.groups as g (g.grp)}
		<h3>{g.grp}</h3>
		{#each g.subs as sub, i (i)}
			{#if sub.subgroup}<h4>{sub.subgroup}</h4>{/if}
			<ul>
				{#each sub.values as v, j (j)}<li>{@html v}</li>{/each}
			</ul>
		{/each}
	{/each}
</div>

<style>
	h3 {
		margin: 14px 0 6px;
	}
	h3:first-child {
		margin-top: 0;
	}
	h4 {
		margin: 8px 0 4px;
		color: var(--mu);
	}
	ul {
		padding-left: 20px;
		margin: 0;
	}
</style>
