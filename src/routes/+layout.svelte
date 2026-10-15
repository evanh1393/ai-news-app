<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { refreshAll } from '$app/navigation';
	import { version } from '$app/env';
	import { OUTAGES_MAINTENANCE } from '#lib/outages.js';

	let { data, children } = $props();

	const nav = [
		{ href: '/', label: 'Latest' },
		{ href: '/archive', label: 'Archive' },
		{ href: '/outages', label: 'Outages' },
		{ href: '/sources', label: 'Sources' },
		{ href: '/search', label: 'Search' }
	];

	function isActive(href: string) {
		const p = page.url.pathname;
		if (href === '/') return p === '/';
		if (href === '/archive') return p.startsWith('/archive') || p.startsWith('/briefing');
		return p.startsWith(href);
	}

	function toggleTheme() {
		const root = document.documentElement;
		const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
		root.dataset.theme = theme;
		localStorage.theme = theme;
	}

	// Refresh data (outage dot etc.) every 5 minutes.
	$effect(() => {
		const t = setInterval(() => refreshAll(), 5 * 60_000);
		return () => clearInterval(t);
	});
</script>

<svelte:head><title>AI Morning Briefing</title></svelte:head>

<div class="sticky top-0 z-10 px-3 pt-3 sm:px-6 sm:pt-4">
	<header
		class="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 rounded-box border border-base-300 bg-base-200/85 py-2.5 pr-2.5 pl-5 backdrop-blur-md sm:grid-cols-[1fr_auto_1fr]"
	>
		<a class="text-lg font-medium tracking-tight transition-opacity hover:opacity-70" href="/">AI Briefing</a>
		<nav class="order-last col-span-2 -mx-1 sm:order-none sm:col-span-1">
			<ul class="flex flex-wrap gap-x-6 gap-y-1 text-[15px] font-medium">
				{#each nav as n (n.href)}
					<li>
						<a
							href={n.href}
							class="inline-flex items-center gap-1.5 px-1 transition-opacity hover:opacity-100"
							class:opacity-50={!isActive(n.href)}
							aria-current={isActive(n.href) ? 'page' : undefined}
						>
							{#if n.href === '/outages'}
								{#if OUTAGES_MAINTENANCE}
									<span class="status status-warning" title="Outage checks are under maintenance"></span>
								{:else}
									<span class="status" class:status-success={!data.active} class:status-error={data.active} class:animate-pulse={data.active}></span>
								{/if}
							{/if}{n.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		<button class="btn btn-ghost btn-sm btn-square justify-self-end" onclick={toggleTheme} aria-label="Toggle theme">
			<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
			</svg>
		</button>
	</header>
</div>

<main class="mx-auto max-w-6xl px-3 pt-8 pb-16 sm:px-6 sm:pt-12">
	{@render children()}
</main>

<footer class="mx-auto max-w-6xl px-3 pb-10 sm:px-6">
	<div class="flex flex-col gap-4 border-t border-base-300/60 pt-6 text-sm text-base-content/45 sm:flex-row sm:items-center sm:justify-between">
		<p>
			<a class="text-base-content/70 transition-colors hover:text-base-content" href="/">AI Briefing</a> · curated by AI, about AI
			·
			{#if /^[0-9a-f]{7}$/.test(version)}
				<a
					class="font-mono transition-colors hover:text-base-content"
					href="https://github.com/evanh1393/ai-news-app/commit/{version}"
					title="The commit this site was built from">{version}</a
				>
			{:else}
				<span class="font-mono" title="The commit this site was built from">{version}</span>
			{/if}
		</p>
		<ul class="flex flex-wrap gap-x-5 gap-y-1">
			{#each nav as n (n.href)}
				<li><a class="transition-colors hover:text-base-content" href={n.href}>{n.label}</a></li>
			{/each}
		</ul>
	</div>
</footer>
