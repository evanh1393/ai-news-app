<script lang="ts">
	import { page } from '$app/state';

	// Our own copy per status. For a 4xx, SvelteKit's message is ours (from error()), so it's shown as
	// the detail. A 5xx message is the generic "Internal Error", never the real exception.
	const copy: Record<number, { title: string; body: string }> = {
		400: { title: 'That request didn’t look right.', body: 'Something in the address or the search couldn’t be read.' },
		403: { title: 'You don’t have access to this.', body: 'This page isn’t open to the public.' },
		404: { title: 'This page isn’t here.', body: 'It may have moved, or the link may be mistyped. Older briefings are in the archive.' },
		429: { title: 'Slow down a little.', body: 'Too many requests came in at once. Wait a few seconds and try again.' },
		503: { title: 'Back in a moment.', body: 'The site is briefly unavailable. Try again shortly.' }
	};
	const fallback = (status: number) =>
		status >= 500
			? { title: 'Something went wrong on our end.', body: 'The error has been logged. Try again, or head back to the latest briefing.' }
			: { title: 'That didn’t work.', body: 'The page couldn’t be shown.' };

	let status = $derived(page.status);
	let c = $derived(copy[status] ?? fallback(status));
	let detail = $derived(status < 500 && page.error?.message && page.error.message !== 'Not Found' ? page.error.message : '');
</script>

<svelte:head><title>{status} · AI Briefing</title></svelte:head>

<div class="mx-auto max-w-3xl py-8 sm:py-16">
	<header class="intro">
		<p class="font-mono text-sm tracking-wide text-base-content/45">Error {status}</p>
		<h2 class="mt-3 font-serif text-5xl leading-[1.05] tracking-normal text-balance italic sm:text-6xl">{c.title}</h2>
		<p class="mt-4 text-lg text-pretty text-base-content/60">
			{c.body}{#if detail}<span class="mt-2 block text-base text-base-content/45">{detail}.</span>{/if}
		</p>
	</header>

	<div class="mt-10 flex flex-wrap gap-3">
		<a class="btn btn-primary" href="/">Latest briefing</a>
		<a class="btn btn-ghost" href="/archive">Archive</a>
		{#if status === 404}<a class="btn btn-ghost" href="/search">Search</a>{/if}
		{#if status === 429 || status >= 500}
			<button class="btn btn-ghost" onclick={() => location.reload()}>Try again</button>
		{/if}
	</div>
</div>
