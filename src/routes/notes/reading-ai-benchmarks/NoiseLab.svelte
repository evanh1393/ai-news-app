<script lang="ts">
	// Two models a few points apart: pick the benchmark size and the gap, and see whether the
	// difference clears the noise. Normal approximation, 95%.
	import { entry } from './glossary';

	const sizes = [
		{ n: 30, name: 'AIME (one year)', term: 'AIME' },
		{ n: 198, name: 'GPQA Diamond', term: 'GPQA' },
		{ n: 500, name: 'SWE-bench Verified', term: 'SWE-bench' },
		{ n: 2500, name: 'Humanity’s Last Exam', term: 'HLE' },
		{ n: 12000, name: 'MMLU-Pro', term: 'MMLU-Pro' }
	];

	let si = $state(1);
	const picked = $derived(entry(sizes[si].term)!);
	let gap = $state(4);

	const A = 62;
	const B = $derived(A - gap);
	const n = $derived(sizes[si].n);
	const moe = (p: number) => 1.96 * Math.sqrt(((p / 100) * (1 - p / 100)) / n) * 100;
	const diffMoe = $derived(1.96 * Math.sqrt(((A / 100) * (1 - A / 100) + (B / 100) * (1 - B / 100)) / n) * 100);
	const real = $derived(gap > diffMoe);

	// Draw the 25–95% window so small bands stay visible.
	const LO = 25;
	const HI = 95;
	const x = (v: number) => Math.min(100, Math.max(0, ((v - LO) / (HI - LO)) * 100));
	const rows = $derived([
		{ label: 'Model A', v: A, m: moe(A), strong: true },
		{ label: 'Model B', v: B, m: moe(B), strong: false }
	]);
</script>

<div class="rounded-md border border-base-300/60 bg-base-200/50 p-5 backdrop-blur-sm sm:p-7">
	<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Benchmark size">
		{#each sizes as s, i (s.n)}
			<button
				type="button"
				role="radio"
				aria-checked={si === i}
				class="rounded-full border px-3 py-1.5 text-left text-sm transition-all duration-300"
				class:border-base-content={si === i}
				class:bg-base-content={si === i}
				class:text-base-100={si === i}
				class:border-base-300={si !== i}
				class:hover:border-base-content-50={si !== i}
				onclick={() => (si = i)}
			>
				<span class="tabular-nums">{s.n.toLocaleString('en-US')}</span>
				<span class="opacity-60"> · {s.name}</span>
			</button>
		{/each}
	</div>

	{#key si}
		<p class="swap mt-4 text-sm text-pretty text-base-content/55">
			<span class="font-medium text-base-content">{sizes[si].name}</span>{#if picked.full}<span> ({picked.full})</span>{/if}: {picked.def}
		</p>
	{/key}

	<label class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
		<span class="text-base-content/60">Gap between the models</span>
		<input type="range" min="0.5" max="12" step="0.5" bind:value={gap} class="range range-xs w-48 grow sm:grow-0" />
		<span class="font-medium tabular-nums">{gap.toFixed(1)} pts</span>
	</label>

	<div class="mt-7 flex flex-col gap-4">
		{#each rows as r (r.label)}
			<div class="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3 text-sm sm:grid-cols-[5rem_1fr_5.5rem]">
				<span class:font-medium={r.strong}>{r.label}</span>
				<div class="relative h-7 rounded-sm bg-base-300/40">
					<div
						class="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-500 ease-out"
						class:bg-base-content={r.strong}
						style="width: {x(r.v)}%; {r.strong ? '' : 'background: color-mix(in oklab, var(--color-base-content) 35%, transparent)'}"
					></div>
					<div
						class="band absolute -inset-y-1.5 rounded-sm transition-all duration-500 ease-out"
						style="left: {x(r.v - r.m)}%; width: {x(r.v + r.m) - x(r.v - r.m)}%"
					></div>
				</div>
				<span class="text-right tabular-nums">{r.v.toFixed(1)}<span class="text-base-content/45"> ±{r.m.toFixed(1)}</span></span>
			</div>
		{/each}
	</div>

	<div class="mt-7 flex flex-wrap items-center gap-3 border-t border-base-300/60 pt-4">
		<span
			class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors duration-500"
			class:verdict-real={real}
			class:verdict-noise={!real}
		>
			<span class="size-2 rounded-full bg-current"></span>{real ? 'A real difference' : 'Could be noise'}
		</span>
		<span class="text-sm text-pretty text-base-content/60">
			On {n.toLocaleString('en-US')} questions a gap needs to beat about <b class="font-medium text-base-content tabular-nums">{diffMoe.toFixed(1)} pts</b>
			to count. One question is worth {(100 / n).toFixed(n >= 1000 ? 2 : 1)} pts.
		</span>
	</div>
</div>

<style>
	.band {
		background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--color-warning) 40%, transparent) 0 3px, transparent 3px 7px);
		border: 1px solid color-mix(in oklab, var(--color-warning) 55%, transparent);
	}
	.verdict-real {
		background: color-mix(in oklab, var(--color-success) 16%, transparent);
		color: var(--color-success);
	}
	.verdict-noise {
		background: color-mix(in oklab, var(--color-warning) 18%, transparent);
		color: color-mix(in oklab, var(--color-warning) 70%, var(--color-base-content));
	}
	@media (prefers-reduced-motion: no-preference) {
		.swap {
			animation: swap 0.4s ease-out both;
		}
	}
	@keyframes swap {
		from {
			opacity: 0;
			filter: blur(4px);
		}
	}
	.hover\:border-base-content-50:hover {
		border-color: color-mix(in oklab, var(--color-base-content) 50%, transparent);
	}
</style>
