<script lang="ts">
	import type { Glyph } from './content';

	// One line-drawn mark per benchmark type; the .g-live part drifts gently (see the style below).
	let { kind, class: cls = '' }: { kind: Glyph; class?: string } = $props();
</script>

<svg viewBox="0 0 48 48" class={cls} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	{#if kind === 'knowledge'}
		{#each [12, 20, 28, 36] as y, i (y)}
			<circle cx="10" cy={y} r="3" class={i === 2 ? 'g-live' : ''} fill={i === 2 ? 'currentColor' : 'none'} />
			<path d="M18 {y}h{20 - i * 3}" opacity="0.4" />
		{/each}
	{:else if kind === 'novel'}
		{#each [0, 1, 2] as r (r)}
			{#each [0, 1, 2] as c (c)}
				<rect x={9 + c * 11} y={9 + r * 11} width="8" height="8" rx="1.5" fill={(r + c) % 2 === 0 ? 'currentColor' : 'none'} opacity={(r + c) % 2 === 0 ? 0.85 : 0.35} class={r === 2 && c === 2 ? 'g-live' : ''} />
			{/each}
		{/each}
	{:else if kind === 'math'}
		<path d="M30 10H12l10 14-10 14h18" />
		<rect x="31" y="27" width="10" height="11" rx="2" class="g-live" />
		<path d="M34 32.5h4" />
	{:else if kind === 'coding'}
		<path d="M16 14l-8 10 8 10M32 14l8 10-8 10" opacity="0.5" />
		<path d="M19 25l4 4 7-9" class="g-live" stroke-width="2" />
	{:else if kind === 'agents'}
		<path d="M8 36c6-14 14 2 20-12s10-6 12-12" opacity="0.4" stroke-dasharray="2 3" />
		<circle cx="8" cy="36" r="2.5" fill="currentColor" />
		<circle cx="24" cy="26" r="2.5" />
		<path d="M38 8l2 9-3.5-2-2.5 4-2-1 2.5-4-3.5-1z" fill="currentColor" class="g-live" />
	{:else if kind === 'facts'}
		<circle cx="21" cy="21" r="11" />
		<path d="M29 29l9 9" />
		<path d="M16 21l3.5 3.5L26 18" class="g-live" stroke-width="2" />
	{:else}
		<rect x="8" y="12" width="13" height="24" rx="2" opacity="0.45" />
		<rect x="27" y="12" width="13" height="24" rx="2" />
		<path d="M30 30l3.5 3.5 6-8" class="g-live" stroke-width="2" />
	{/if}
</svg>

<style>
	@media (prefers-reduced-motion: no-preference) {
		svg :global(.g-live) {
			animation: drift 3.2s ease-in-out infinite;
			transform-box: fill-box;
			transform-origin: center;
		}
	}
	@keyframes drift {
		50% {
			opacity: 0.35;
			scale: 0.9;
		}
	}
</style>
