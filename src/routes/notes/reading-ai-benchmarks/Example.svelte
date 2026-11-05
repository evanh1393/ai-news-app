<script lang="ts">
	import type { Glyph } from './content';

	// A made-up task in the style of each type's best-known benchmark, drawn the way the model sees it,
	// with its result. Invented on purpose: real benchmark questions are kept out of the open.
	let { kind }: { kind: Glyph } = $props();

	// Novel puzzles: every filled cell falls to the bottom of its column.
	const fall = (g: number[][]) => {
		const out = g.map((r) => r.map(() => 0));
		for (let c = 0; c < g[0].length; c++) {
			const col = g.map((r) => r[c]).filter(Boolean);
			col.forEach((v, i) => (out[g.length - col.length + i][c] = v));
		}
		return out;
	};
	const pairs = [
		[
			[1, 0, 0],
			[0, 0, 2],
			[0, 0, 0]
		],
		[
			[0, 2, 0],
			[1, 0, 1],
			[0, 0, 0]
		]
	];
	const testIn = [
		[2, 0, 1],
		[0, 1, 0],
		[0, 0, 0]
	];
</script>

{#snippet grid(g: number[][], small = false)}
	<span class="inline-grid gap-0.5 rounded-sm bg-base-300/60 p-0.5" style="grid-template-columns: repeat({g[0].length}, minmax(0, 1fr))">
		{#each g.flat() as v, i (i)}
			<span class="cell {small ? 'size-4' : 'size-6'} rounded-[2px]" class:c1={v === 1} class:c2={v === 2}></span>
		{/each}
	</span>
{/snippet}

<div class="example text-[15px]">
	{#if kind === 'knowledge'}
		<p class="leading-snug text-pretty">
			A protein with an isoelectric point of 6.5 is placed in a buffer at pH 4 and an electric field is applied. Which way does it move?
		</p>
		<ol class="mt-4 grid gap-2 sm:grid-cols-2">
			{#each ['Toward the negative electrode', 'Toward the positive electrode', 'It doesn’t move', 'It depends on its size'] as o, i (o)}
				<li class="step flex items-center gap-3 rounded-md border px-3 py-2" class:picked={i === 0} class:border-base-300={i !== 0} style="--d: {i * 90}ms">
					<span class="grid size-6 shrink-0 place-items-center rounded-full border border-current text-xs font-medium">{'ABCD'[i]}</span>
					<span class="leading-snug">{o}</span>
					{#if i === 0}<span class="ml-auto text-xs whitespace-nowrap opacity-70">model’s pick ✓</span>{/if}
				</li>
			{/each}
		</ol>
		<p class="mt-3 text-xs text-base-content/45">You’re not meant to know this one. That’s the point: these are written so that only specialists can.</p>
	{:else if kind === 'novel'}
		<div class="flex flex-wrap items-end gap-x-8 gap-y-5">
			{#each pairs as p, i (i)}
				<div class="step" style="--d: {i * 120}ms">
					<p class="mb-1.5 text-xs text-base-content/45">Example {i + 1}</p>
					<span class="flex items-center gap-2">{@render grid(p, true)}<span class="text-base-content/40">→</span>{@render grid(fall(p), true)}</span>
				</div>
			{/each}
			<div class="step" style="--d: 260ms">
				<p class="mb-1.5 text-xs text-base-content/45">Test: what comes out?</p>
				<span class="flex items-center gap-2">{@render grid(testIn)}<span class="text-base-content/40">→</span>{@render grid(fall(testIn))}</span>
			</div>
		</div>
		<p class="step mt-4 text-sm text-base-content/60" style="--d: 380ms">
			The rule, never stated: <span class="text-base-content">everything falls to the bottom of its column.</span> The model’s grid matches cell for cell ✓
		</p>
	{:else if kind === 'math'}
		<p class="leading-snug text-pretty">How many positive whole numbers less than 1,000 are divisible by 7 but not by 11?</p>
		<div class="mt-4 grid gap-2 font-mono text-sm sm:grid-cols-[1fr_auto] sm:items-end">
			<div class="flex flex-col gap-1 text-base-content/55">
				<span class="step" style="--d: 0ms">multiples of 7 below 1,000 → 142</span>
				<span class="step" style="--d: 120ms">multiples of 77 (7 × 11) → 12</span>
				<span class="step" style="--d: 240ms">142 − 12</span>
			</div>
			<span class="step picked inline-flex items-center gap-2 justify-self-start rounded-md border px-3 py-1.5 text-base" style="--d: 360ms">answer: 130 ✓</span>
		</div>
		<p class="mt-3 text-xs text-base-content/45">Only “130” is checked. The working above could be nonsense and still score.</p>
	{:else if kind === 'coding'}
		<div class="rounded-md border border-base-300 bg-base-100/60">
			<p class="flex items-center gap-2 border-b border-base-300 px-3 py-2 text-sm">
				<span class="size-2 rounded-full bg-success"></span><span class="font-medium">parse_date() crashes on dates before 1900</span><span class="ml-auto text-xs text-base-content/40">issue #4821</span>
			</p>
			<!-- One block span per line, no newlines between them: inside <pre> those would add blank lines. -->
			<pre class="overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed"><span class="ctx">      dt = datetime.strptime(s, FMT)</span><span class="del">-     if dt.year &lt; 1900:</span><span class="del">-         raise ValueError("year out of range")</span><span class="add">+     dt = dt.replace(tzinfo=None)</span><span class="ctx">      return dt</span></pre>
		</div>
		<p class="mt-4 mb-2 text-xs tracking-wide text-base-content/45 uppercase">Hidden tests</p>
		<ul class="flex flex-col gap-1 font-mono text-sm">
			{#each [['test_parse_1899', true, 'the bug'], ['test_parse_2024', true, 'still works'], ['test_parse_timezone', false, 'broke something else']] as [name, ok, why], i (name)}
				<li class="step flex items-center gap-3" style="--d: {i * 140}ms">
					<span class:text-success={ok} class:text-error={!ok}>{ok ? '✓' : '✗'}</span>{name}<span class="font-sans text-xs text-base-content/45">{why}</span>
				</li>
			{/each}
		</ul>
		<p class="step mt-3 text-sm" style="--d: 450ms"><span class="font-medium text-error">Task failed.</span> <span class="text-base-content/60">Fixing the bug isn’t enough if the fix breaks another test.</span></p>
	{:else if kind === 'agents'}
		<ol class="flex flex-col gap-2 text-sm">
			{#each [['Customer', 'I need to move my flight to Friday. Booking ABC123.', 'user'], ['Agent → tool', 'get_booking("ABC123") → basic economy, Tuesday', 'tool'], ['Agent', 'Checks the rules: basic economy can’t be changed.', 'think'], ['Agent', 'Your fare can’t be changed, but I can cancel it for travel credit. Want me to?', 'agent'], ['Check', 'Booking untouched, rule followed ✓', 'check']] as [who, what, k], i (i)}
				<li class="step flex gap-3" style="--d: {i * 130}ms">
					<span class="w-24 shrink-0 text-xs leading-5 text-base-content/45">{who}</span>
					<span
						class="rounded-md px-3 py-1.5 leading-snug"
						class:bg-base-300={k === 'user'}
						class:font-mono={k === 'tool'}
						class:text-xs={k === 'tool'}
						class:border={k === 'tool' || k === 'agent'}
						class:border-base-300={k === 'tool' || k === 'agent'}
						class:italic={k === 'think'}
						class:text-base-content={k !== 'think'}
						class:text-base-content-60={k === 'think'}
						class:picked={k === 'check'}>{what}</span
					>
				</li>
			{/each}
		</ol>
		<p class="mt-3 text-xs text-base-content/45">Had the agent just changed the flight, the customer would be happy and the task would still fail.</p>
	{:else if kind === 'facts'}
		<p class="leading-snug">In what year did the Eiffel Tower open to the public?</p>
		<ul class="mt-4 flex flex-col gap-2">
			{#each [['“1889.”', 'Correct', 'text-success'], ['“1887.”', 'Incorrect (that’s when building started)', 'text-error'], ['“I’m not sure.”', 'Not attempted, not counted as wrong', 'text-base-content/55']] as [a, g, c], i (a)}
				<li class="step flex flex-wrap items-baseline gap-x-4 gap-y-0.5 rounded-md border border-base-300 px-3 py-2" style="--d: {i * 120}ms">
					<span class="w-32 font-medium">{a}</span><span class="text-sm {c}">{g}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-base-content/55">Prompt: <span class="text-base-content">Explain recursion to a 10-year-old.</span></p>
		<div class="mt-3 grid gap-3 sm:grid-cols-2">
			<div class="step rounded-md border border-base-300 p-3 text-sm leading-snug" style="--d: 0ms">
				<p class="mb-1 text-xs text-base-content/45">Answer A</p>
				Recursion is when a function calls itself, like Russian dolls: each doll opens to a smaller one until the smallest.
			</div>
			<div class="step picked rounded-md border p-3 text-sm leading-snug" style="--d: 120ms">
				<p class="mb-1 flex justify-between text-xs opacity-70"><span>Answer B</span><span>voter’s pick</span></p>
				<b>Think of Russian dolls!</b> 🪆<br />• Open a doll, find a smaller one<br />• Keep going…<br />• Stop at the tiniest<br />That’s recursion!
			</div>
		</div>
		<p class="mt-3 text-xs text-base-content/45">Same idea, but B is longer and has formatting. That alone wins a lot of votes.</p>
	{/if}
</div>

<style>
	.example :global(.picked) {
		border-color: var(--color-base-content);
		background: color-mix(in oklab, var(--color-base-content) 6%, transparent);
	}
	.cell {
		background: var(--color-base-100);
	}
	.cell.c1 {
		background: var(--color-base-content);
	}
	.cell.c2 {
		background: var(--color-warning);
	}
	.ctx {
		display: block;
		color: color-mix(in oklab, var(--color-base-content) 40%, transparent);
	}
	.del {
		display: block;
		color: var(--color-error);
		background: color-mix(in oklab, var(--color-error) 10%, transparent);
	}
	.add {
		display: block;
		color: var(--color-success);
		background: color-mix(in oklab, var(--color-success) 10%, transparent);
	}
	.text-base-content-60 {
		color: color-mix(in oklab, var(--color-base-content) 60%, transparent);
	}
	@supports (animation-timeline: view()) {
		@media (prefers-reduced-motion: no-preference) {
			.step {
				animation: rise linear both;
				animation-timeline: view();
				animation-range: entry 10% entry 100%;
				animation-delay: 0s;
			}
		}
	}
	@media (prefers-reduced-motion: no-preference) {
		@supports not (animation-timeline: view()) {
			.step {
				animation: rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) var(--d, 0ms) both;
			}
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			translate: 0 0.4rem;
			filter: blur(4px);
		}
	}
</style>
