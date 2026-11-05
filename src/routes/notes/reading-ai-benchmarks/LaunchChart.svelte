<script lang="ts">
	import Gloss from './Gloss.svelte';
	import Term from './Term.svelte';

	// A made-up launch chart with its four usual traps marked. Hovering a note lights up its part of
	// the chart; the axis toggle redraws it from zero.
	const bars = [
		{ label: 'Nova 3', v: 78.4, star: true, ours: true },
		{ label: 'Rival A', v: 75.9, borrowed: true },
		{ label: 'Rival B', v: 71.2, borrowed: true },
		{ label: 'Nova 2', v: 58.0 }
	];
	const NOISE = 4.4; // 95% band for 500 tasks near 50%: 1.96·√(0.25/500)

	const notes = [
		{ n: 1, title: 'The asterisk', body: 'The footnote says best of 8 attempts with extra compute. The rivals got one try each.' },
		{ n: 2, title: 'The noise', body: `On 500 tasks every score is about ±${NOISE.toFixed(0)} points. The top two bands overlap, so this lead could disappear on a rerun.` },
		{ n: 3, title: 'The source', body: 'Rival numbers are copied from each company’s own announcement, run in a different harness.' },
		{ n: 4, title: 'The axis', body: 'It starts at 50%, which makes a 2.5-point lead look like a landslide.' }
	];

	let focus = $state<number | null>(null);
	let fromZero = $state(false);

	const lo = $derived(fromZero ? 0 : 50);
	const hi = $derived(fromZero ? 100 : 83);
	const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
	const ticks = $derived(fromZero ? [0, 25, 50, 75, 100] : [50, 60, 70, 80]);
	const dim = (n: number) => focus !== null && focus !== n;
	// Notes 1 and 3 are about particular bars; the others concern the whole chart.
	const barDim = (b: (typeof bars)[number]) => (focus === 1 && !b.ours) || (focus === 3 && !b.borrowed);
</script>

<div class="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
	<figure class="self-start rounded-md border border-base-300/60 bg-base-200/50 p-5 backdrop-blur-sm sm:p-7">
		<figcaption class="mb-6 flex flex-wrap items-baseline justify-between gap-2">
			<span>
				<span class="text-lg font-medium"><Term term="SWE-bench">SWE-bench</Term> Verified</span>
				<span class="block text-sm text-base-content/50">% of 500 real GitHub issues resolved</span>
			</span>
			<button
				type="button"
				class="btn btn-ghost btn-xs rounded-full border border-base-300 transition-all"
				class:ring-2={focus === 4}
				class:ring-base-content={focus === 4}
				onclick={() => (fromZero = !fromZero)}
				aria-pressed={fromZero}>{fromZero ? 'Axis from 50%' : 'Show axis from 0'}</button
			>
		</figcaption>

		<div class="relative">
			<!-- gridlines -->
			<div class="pointer-events-none absolute inset-y-0 right-16 left-[5.5rem]">
				{#each ticks as t (t)}
					<div class="absolute inset-y-0 border-l border-dashed border-base-content/10 transition-[left] duration-700" style="left: {pct(t)}%"></div>
				{/each}
			</div>

			<ul class="relative flex flex-col gap-3.5">
				{#each bars as b, i (b.label)}
					<li class="grid grid-cols-[5.5rem_1fr] items-center">
						<span
							class="flex items-center gap-1.5 truncate pr-3 text-sm transition-opacity duration-300"
							class:opacity-30={barDim(b)}
							class:font-medium={b.ours}
						>
							{b.label}
							{#if b.borrowed && i === 1}<span class="marker" class:on={focus === 3}>3</span>{/if}
						</span>
						<div class="relative mr-16 h-9">
							{#if i < 2}
								<!-- 95% noise band around the score -->
								<div
									class="noise absolute inset-y-[-4px] rounded-sm transition-all duration-700"
									class:opacity-0={dim(2)}
									class:on={focus === 2}
									style="left: {pct(b.v - NOISE)}%; width: {pct(b.v + NOISE) - pct(b.v - NOISE)}%"
								></div>
							{/if}
							<div
								class="bar relative h-full rounded-sm transition-[width,opacity] duration-700 ease-out"
								class:bg-base-content={b.ours}
								class:bg-base-content-30={!b.ours}
								class:opacity-25={barDim(b)}
								style="width: {pct(b.v)}%; animation-delay: {i * 110}ms"
							></div>
							<span
								class="absolute top-1/2 -translate-y-1/2 pl-2 text-sm whitespace-nowrap tabular-nums transition-[left] duration-700 ease-out"
								style="left: {pct(b.v)}%"
							>
								{b.v.toFixed(1)}{#if b.star}<span class="marker ml-1" class:on={focus === 1}>1</span>{/if}
								{#if i === 0}<span class="marker ml-1" class:on={focus === 2}>2</span>{/if}
							</span>
						</div>
					</li>
				{/each}
			</ul>

			<!-- axis -->
			<div class="relative mt-2 mr-16 ml-[5.5rem] h-5 text-xs text-base-content/40 tabular-nums">
				{#each ticks as t (t)}
					<span class="absolute -translate-x-1/2 transition-[left] duration-700" style="left: {pct(t)}%">{t}</span>
				{/each}
				<span class="marker absolute -top-0.5 -left-9" class:on={focus === 4}>4</span>
			</div>
		</div>

		<p class="mt-5 border-t border-base-300/60 pt-3 text-xs text-base-content/45 transition-colors" class:text-base-content={focus === 1}>
			<span class="marker mr-1" class:on={focus === 1}>1</span>* Best of 8 attempts with parallel test-time compute. Competitor scores as reported by each company.
		</p>
	</figure>

	<div class="flex flex-col">
		<p class="mb-3 text-sm tracking-wide text-base-content/45 uppercase">Four things to spot</p>
		<ol class="flex flex-col gap-2">
			{#each notes as note (note.n)}
				<li>
					<button
						type="button"
						class="w-full rounded-md border border-transparent p-3 text-left transition-all duration-300 hover:border-base-300/60 hover:bg-base-200/60 focus-visible:border-base-300 focus-visible:outline-none"
						class:bg-base-200={focus === note.n}
						class:border-base-300={focus === note.n}
						onmouseenter={() => (focus = note.n)}
						onmouseleave={() => (focus = null)}
						onfocus={() => (focus = note.n)}
						onblur={() => (focus = null)}
						onclick={() => note.n === 4 && (fromZero = !fromZero)}
					>
						<span class="flex items-start gap-3">
							<span class="marker mt-0.5 shrink-0" class:on={focus === note.n}>{note.n}</span>
							<span>
								<span class="font-medium">{note.title}</span>
								<span class="mt-0.5 block text-[15px] leading-snug text-pretty text-base-content/60"><Gloss text={note.body} /></span>
							</span>
						</span>
					</button>
				</li>
			{/each}
		</ol>
		<p class="mt-4 border-l-2 border-primary/60 pl-3 text-pretty text-base-content/80">
			<span class="font-medium text-base-content">Honest reading:</span> roughly level, maybe ahead. Wait for an independent run.
		</p>
	</div>
</div>

<style>
	.bg-base-content-30 {
		background: color-mix(in oklab, var(--color-base-content) 28%, transparent);
	}
	.noise {
		background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--color-warning) 35%, transparent) 0 3px, transparent 3px 7px);
		border: 1px solid color-mix(in oklab, var(--color-warning) 50%, transparent);
	}
	.noise.on {
		background-color: color-mix(in oklab, var(--color-warning) 18%, transparent);
	}
	.marker {
		display: inline-grid;
		place-items: center;
		width: 1.15rem;
		height: 1.15rem;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 600;
		line-height: 1;
		border: 1px solid color-mix(in oklab, var(--color-base-content) 35%, transparent);
		color: color-mix(in oklab, var(--color-base-content) 70%, transparent);
		transition:
			background 0.3s,
			color 0.3s,
			scale 0.3s;
	}
	.marker.on {
		background: var(--color-base-content);
		color: var(--color-base-100);
		scale: 1.15;
	}
	@media (prefers-reduced-motion: no-preference) {
		.bar {
			animation: grow 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) both;
			transform-origin: left;
		}
	}
	@keyframes grow {
		from {
			scale: 0 1;
			opacity: 0;
		}
	}
</style>
