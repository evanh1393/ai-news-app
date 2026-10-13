<script lang="ts">
	let { page, pages }: { page: number; pages: number } = $props();

	const href = (n: number) => (n === 1 ? '?' : `?page=${n}`);
	const btn = 'btn h-auto rounded-field border-base-300 bg-base-200 px-5 py-3 font-medium shadow-none hover:bg-primary hover:text-primary-content';
</script>

{#if pages > 1}
	<nav class="mt-6 flex items-center justify-between gap-4" aria-label="Pagination">
		{#if page > 1}
			<a class={btn} href={href(page - 1)} rel="prev">← Newer</a>
		{:else}
			<span class="{btn} invisible" aria-hidden="true">← Newer</span>
		{/if}
		<span class="text-sm text-base-content/50 tabular-nums">Page {page} of {pages}</span>
		{#if page < pages}
			<a class={btn} href={href(page + 1)} rel="next">Older →</a>
		{:else}
			<span class="{btn} invisible" aria-hidden="true">Older →</span>
		{/if}
	</nav>
{/if}
