<script lang="ts">
	import Markdown from '#lib/components/Markdown.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Sources · AI Briefing</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<header class="intro mb-8">
		<h2 class="text-4xl leading-[1.05] sm:text-5xl">Sources</h2>
		<p class="mt-4 text-lg text-pretty text-base-content/60">The source list the agent follows when it writes each briefing.</p>
	</header>

	<div class="rounded-md border border-base-300/60 bg-base-200/50 p-6 backdrop-blur-sm sm:p-8">
		<div
			class="prose prose-sm max-w-none break-words text-base-content/65 prose-a:text-base-content prose-code:rounded-sm prose-code:bg-base-300/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:text-base-content/80 prose-code:before:content-none prose-code:after:content-none prose-h3:mt-10 prose-h3:mb-3 prose-h3:border-b prose-h3:border-base-300/60 prose-h3:pb-2 prose-h3:text-lg prose-h3:font-normal prose-h3:text-base-content prose-h3:first:mt-0 prose-h4:mt-5 prose-h4:mb-1 prose-h4:text-xs prose-h4:font-normal prose-h4:tracking-wide prose-h4:text-base-content/45 prose-h4:uppercase prose-ul:my-1 prose-ul:pl-4 prose-li:my-1 prose-li:marker:text-base-content/25"
		>
			{#each data.groups as g (g.grp)}
				<h3>{g.grp}</h3>
				{#each g.subs as sub, i (i)}
					{#if sub.subgroup}<h4>{sub.subgroup}</h4>{/if}
					<ul>
						{#each sub.values as v, j (j)}<li><Markdown md={v} /></li>{/each}
					</ul>
				{/each}
			{/each}
		</div>
	</div>
</div>
