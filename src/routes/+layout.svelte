<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { fmtTime } from '$lib/format';

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
		const light = document.documentElement.classList.toggle('light');
		localStorage.theme = light ? 'light' : 'dark';
	}

	// Refresh data (outage dot etc.) every 5 minutes.
	$effect(() => {
		const t = setInterval(() => invalidateAll(), 5 * 60_000);
		return () => clearInterval(t);
	});
</script>

<svelte:head><title>AI Briefing</title></svelte:head>

<header>
	<a class="brand" href="/">🤖 AI Briefing</a>
	<nav>
		{#each nav as n (n.href)}
			<a href={n.href} class:on={isActive(n.href)}>
				{#if n.href === '/outages'}<span class="dot" class:red={data.active}></span>{/if}{n.label}
			</a>
		{/each}
	</nav>
	<button onclick={toggleTheme} aria-label="Toggle theme">◐</button>
</header>

<main>
	{@render children()}
	<p class="mu">Data updated {fmtTime(data.ingestedAt)}</p>
</main>

<style>
	header {
		position: sticky;
		top: 0;
		background: var(--card);
		border-bottom: 1px solid var(--bd);
		padding: 10px 16px;
		display: flex;
		gap: 14px;
		align-items: center;
		flex-wrap: wrap;
		z-index: 2;
	}
	.brand {
		font-size: 17px;
		font-weight: 700;
		margin-right: auto;
		color: var(--tx);
		text-decoration: none;
	}
	nav a {
		color: var(--mu);
		text-decoration: none;
		margin-right: 12px;
	}
	nav a.on {
		color: var(--tx);
		font-weight: 600;
	}
	.dot {
		display: inline-block;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--grn);
		margin-right: 5px;
	}
	.dot.red {
		background: var(--red);
		animation: pulse 1.2s infinite;
	}
	@keyframes pulse {
		50% {
			opacity: 0.3;
		}
	}
	main {
		max-width: 1100px;
		margin: auto;
		padding: 16px;
	}
	@media (max-width: 600px) {
		header {
			padding: 8px 12px;
			gap: 8px;
		}
		nav a {
			margin-right: 9px;
			font-size: 14px;
		}
		main {
			padding: 12px;
		}
	}
</style>
