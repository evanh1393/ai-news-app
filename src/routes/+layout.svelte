<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { refreshAll } from '$app/navigation';
	import { fmtTime } from '#lib/format.js';

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
		const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
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

<header class="navbar sticky top-0 z-10 flex-wrap gap-2 border-b border-base-300 bg-base-200 px-4 py-2">
	<a class="mr-auto text-lg font-bold" href="/">🤖 AI Briefing</a>
	<nav class="order-last w-full sm:order-none sm:w-auto">
		<ul class="menu menu-horizontal menu-sm gap-1 p-0">
			{#each nav as n (n.href)}
				<li>
					<a href={n.href} class:menu-active={isActive(n.href)}>
						{#if n.href === '/outages'}
							<span class="status" class:status-success={!data.active} class:status-error={data.active} class:animate-pulse={data.active}></span>
						{/if}{n.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
	<button class="btn btn-ghost btn-sm btn-square" onclick={toggleTheme} aria-label="Toggle theme">
		<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
		</svg>
	</button>
</header>

<main class="mx-auto max-w-6xl p-3 sm:p-4">
	{@render children()}
	<p class="mt-4 text-sm text-base-content/60">Data updated {fmtTime(data.ingestedAt)}</p>
</main>
