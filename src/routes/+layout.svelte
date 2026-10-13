<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { refreshAll } from '$app/navigation';
	import { fmtTime } from '#lib/format.js';
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

<svelte:head><title>AI Briefing</title></svelte:head>

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

<footer class="border-t border-base-300">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 px-3 pt-10 pb-6 text-sm sm:px-6">
		<div class="flex flex-wrap items-start justify-between gap-8">
			<a class="text-lg font-medium tracking-tight transition-opacity hover:opacity-70" href="/">AI Briefing</a>
			<div>
				<div class="mb-4 text-base-content/50">Browse</div>
				<ul class="flex flex-col gap-2">
					{#each nav as n (n.href)}
						<li><a class="transition-opacity hover:opacity-70" href={n.href}>{n.label}</a></li>
					{/each}
				</ul>
			</div>
		</div>
		<p class="text-base-content/50">Data updated {fmtTime(data.ingestedAt)}</p>
	</div>
</footer>
