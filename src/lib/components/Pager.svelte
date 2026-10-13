<script lang="ts">
	let { page, pages }: { page: number; pages: number } = $props();

	const href = (n: number) => (n === 1 ? '?' : `?page=${n}`);
</script>

{#if pages > 1}
	<nav class="join mt-3 flex justify-center" aria-label="Pagination">
		{#if page > 1}
			<a class="btn join-item" href={href(page - 1)} rel="prev">« Newer</a>
		{:else}
			<button class="btn join-item" disabled>« Newer</button>
		{/if}
		<span class="btn join-item pointer-events-none">Page {page} of {pages}</span>
		{#if page < pages}
			<a class="btn join-item" href={href(page + 1)} rel="next">Older »</a>
		{:else}
			<button class="btn join-item" disabled>Older »</button>
		{/if}
	</nav>
{/if}
