<script lang="ts">
	import Gloss from './Gloss.svelte';

	// Four tasks, eight tries each, three ways to score the same runs.
	const runs = [
		[1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 0, 1, 1, 1, 0, 1],
		[0, 0, 1, 0, 0, 0, 1, 0],
		[0, 0, 0, 0, 0, 0, 0, 0]
	];

	const modes = [
		{
			id: 'one',
			name: 'pass@1',
			reads: 'One try per task',
			body: 'Each task counts once, on its first try. The default, and the fairest way to compare models.',
			solved: (r: number[]) => r[0] === 1,
			cell: (_r: number[], j: number) => j === 0
		},
		{
			id: 'any',
			name: 'pass@8',
			reads: 'Any of 8 tries',
			body: 'A task counts if any try works. Flattering: unless something checks answers for you, you don’t get to pick the good try.',
			solved: (r: number[]) => r.some(Boolean),
			cell: () => true
		},
		{
			id: 'all',
			name: 'pass^8',
			reads: 'All 8 tries',
			body: 'A task counts only if every try works. This is reliability, what matters for an agent running unattended.',
			solved: (r: number[]) => r.every(Boolean),
			cell: () => true
		}
	];

	let mi = $state(0);
	const m = $derived(modes[mi]);
	const score = $derived((runs.filter(m.solved).length / runs.length) * 100);
</script>

<div class="grid gap-6 rounded-md border border-base-300/60 bg-base-200/50 p-5 backdrop-blur-sm sm:p-7 md:grid-cols-[auto_1fr] md:gap-10">
	<div>
		<div class="grid grid-cols-[3.5rem_repeat(8,1.6rem)_2rem] items-center gap-y-2.5 text-xs text-base-content/45">
			<span></span>
			{#each runs[0] as _, j (j)}<span class="text-center tabular-nums">{j + 1}</span>{/each}
			<span></span>
			{#each runs as r, i (i)}
				<span>Task {i + 1}</span>
				{#each r as ok, j (j)}
					<span class="grid place-items-center">
						<span
							class="dot size-4 rounded-full transition-all duration-500"
							class:ok
							class:faint={!m.cell(r, j)}
							style="animation-delay: {(i * 8 + j) * 35}ms"
						></span>
					</span>
				{/each}
				<span class="grid place-items-center text-base transition-all duration-500" class:opacity-0={!m.solved(r)}>✓</span>
			{/each}
		</div>
		<p class="mt-3 flex items-center gap-4 text-xs text-base-content/45">
			<span class="inline-flex items-center gap-1.5"><span class="dot ok size-2.5 rounded-full"></span>worked</span>
			<span class="inline-flex items-center gap-1.5"><span class="dot size-2.5 rounded-full"></span>failed</span>
		</p>
	</div>

	<div class="flex flex-col">
		<div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Scoring">
			{#each modes as mode, i (mode.id)}
				<button
					type="button"
					role="tab"
					aria-selected={mi === i}
					class="rounded-full border px-3 py-1.5 font-mono text-sm transition-all duration-300"
					class:border-base-content={mi === i}
					class:bg-base-content={mi === i}
					class:text-base-100={mi === i}
					class:border-base-300={mi !== i}
					onclick={() => (mi = i)}>{mode.name}</button
				>
			{/each}
		</div>
		{#key mi}
			<div class="swap-in mt-5">
				<p class="text-sm tracking-wide text-base-content/45 uppercase">{m.reads}</p>
				<p class="mt-1 font-serif text-6xl leading-none italic tabular-nums">{score}%</p>
				<p class="mt-3 max-w-md text-pretty text-base-content/65"><Gloss text={m.body} /></p>
			</div>
		{/key}
		<p class="mt-auto pt-5 text-sm text-pretty text-base-content/45">Same runs, three scores: 25%, 50% or 75%. Always check which one you’re reading.</p>
	</div>
</div>

<style>
	.dot {
		border: 1.5px solid color-mix(in oklab, var(--color-base-content) 30%, transparent);
	}
	.dot.ok {
		background: var(--color-base-content);
		border-color: var(--color-base-content);
	}
	.dot.faint {
		opacity: 0.15;
		scale: 0.8;
	}
	@media (prefers-reduced-motion: no-preference) {
		.dot {
			animation: pop 0.5s cubic-bezier(0.2, 0.7, 0.2, 1.4) backwards;
		}
		.swap-in {
			animation: fade 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}
	}
	@keyframes pop {
		from {
			scale: 0;
			opacity: 0;
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
			filter: blur(6px);
			translate: 0 0.35rem;
		}
	}
</style>
