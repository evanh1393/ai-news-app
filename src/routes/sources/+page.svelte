<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Sources · AI Briefing</title></svelte:head>

<h2 class="mb-8 text-4xl leading-none sm:text-5xl">Sources</h2>
<div class="card border border-base-300 bg-base-200">
	<div class="card-body prose prose-sm max-w-none p-4 prose-a:text-primary prose-h3:mt-4 prose-h3:mb-1 prose-h3:first:mt-0 prose-h4:my-1 prose-h4:text-base-content/60 prose-ul:my-1">
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
</div>
