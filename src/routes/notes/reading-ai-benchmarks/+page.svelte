<script lang="ts">
	import Note from '#lib/components/Note.svelte';
	import Attempts from './Attempts.svelte';
	import LaunchChart from './LaunchChart.svelte';
	import NoiseLab from './NoiseLab.svelte';
	import TypeGlyph from './TypeGlyph.svelte';
	import Example from './Example.svelte';
	import Gloss from './Gloss.svelte';
	import Term from './Term.svelte';
	import { HUBS, TYPES, host } from './content';
	import { GLOSSARY, entry } from './glossary';

	const glossary = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));

	const toc = [
		{ id: 'anatomy', label: 'Anatomy of a score' },
		{ id: 'types', label: 'Types of test' },
		{ id: 'noise', label: 'Noise' },
		{ id: 'attempts', label: 'Attempts' },
		{ id: 'check', label: 'Where to check' },
		{ id: 'cheatsheet', label: 'Cheat sheet' },
		{ id: 'glossary', label: 'Glossary' }
	];

	const cheats = [
		['Floor', 'What does guessing score? Four choices is 25%.'],
		['Ceiling', 'Is everyone near the top? Then it’s saturated.'],
		['Size', 'How many questions? Ignore gaps inside the noise.'],
		['Footnotes', 'Attempts, compute, tools, harness.'],
		['Source', 'Self-reported or independent? Trust independent.'],
		['Freshness', 'Could the model have trained on the test?']
	];
</script>

<Note slug="reading-ai-benchmarks">
	<nav class="intro -mt-6 mb-16 sm:-mt-10" aria-label="On this page">
		<ul class="flex flex-wrap gap-2 text-sm">
			{#each toc as t, i (t.id)}
				<li>
					<a
						class="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/50 px-3.5 py-1.5 text-base-content/70 backdrop-blur-sm transition-colors hover:border-base-content/40 hover:text-base-content"
						href="#{t.id}"><span class="text-xs text-base-content/35 tabular-nums">{String(i + 1).padStart(2, '0')}</span>{t.label}</a
					>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- 1. Anatomy -->
	<section id="anatomy" class="scroll-mt-28">
		<div class="reveal mb-8 max-w-2xl">
			<p class="text-sm tracking-wide text-base-content/45 uppercase">01 · Anatomy of a score</p>
			<h3 class="mt-2 text-3xl leading-tight sm:text-4xl">A benchmark is a fixed set of tasks and a way to grade them.</h3>
			<p class="mt-3 text-pretty text-base-content/60">
				Run a model on every task and you get a percentage. That’s all a score is: how well a model did on <em>those</em> tasks, under <em>those</em> settings.
				Every launch comes with a chart like this one. Hover the notes to see what to check.
			</p>
		</div>
		<div class="reveal"><LaunchChart /></div>
	</section>

	<!-- 2. Types -->
	<section id="types" class="mt-28 scroll-mt-28">
		<div class="reveal mb-8 max-w-2xl">
			<p class="text-sm tracking-wide text-base-content/45 uppercase">02 · Types of test</p>
			<h3 class="mt-2 text-3xl leading-tight sm:text-4xl">Seven kinds of test, each measuring something different.</h3>
			<p class="mt-3 text-pretty text-base-content/60">
				A model can top one kind and trail in another, so first work out which kind a number comes from. Each one below has a sample task (made up, in the
				style of a well-known test), how it’s graded, and a sample score read step by step.
			</p>
		</div>

		<ul class="reveal grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
			{#each TYPES as t, i (t.id)}
				<li>
					<a
						href="#type-{t.id}"
						class="group flex h-full flex-col gap-3 rounded-md border border-base-300/60 bg-base-200/50 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-base-content/30"
					>
						<span class="flex items-center justify-between text-xs text-base-content/35 tabular-nums">
							{String(i + 1).padStart(2, '0')}
							<span class="opacity-0 transition-opacity group-hover:opacity-100">↓</span>
						</span>
						<TypeGlyph kind={t.id} class="size-9 text-base-content/80" />
						<span>
							<span class="block leading-tight font-medium">{t.name}</span>
							<span class="mt-1 block text-xs text-base-content/50">{t.short}</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>

		<div class="mt-16 flex flex-col">
			{#each TYPES as t, i (t.id)}
				<article id="type-{t.id}" class="grid scroll-mt-28 gap-8 border-t border-base-300/60 py-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-14">
					<div class="reveal self-start lg:sticky lg:top-32">
						<div class="flex items-center gap-4">
							<TypeGlyph kind={t.id} class="size-12 shrink-0" />
							<span class="text-sm text-base-content/35 tabular-nums">{String(i + 1).padStart(2, '0')} / {String(TYPES.length).padStart(2, '0')}</span>
						</div>
						<h4 class="mt-5 font-serif text-4xl leading-none tracking-normal italic sm:text-5xl">{t.name}</h4>
						<p class="mt-4 text-pretty text-base-content/65"><Gloss text={t.tests} /></p>

						<p class="mt-7 text-xs tracking-wide text-base-content/45 uppercase">Well-known tests of this kind</p>
						<p class="mt-2 flex flex-wrap gap-1.5">
							{#each t.family as f (f)}
								<span class="rounded-full bg-base-300/50 px-2.5 py-0.5 text-sm text-base-content/75">{#if entry(f)}<Term term={f} />{:else}{f}{/if}</span>
							{/each}
						</p>
						{#if t.retired}
							<p class="mt-4 text-sm text-base-content/45">
								<span class="text-xs tracking-wide uppercase">Retired:</span>
								{#each t.retired.names.split(' · ') as r, k (r)}{#if k}{' · '}{/if}<span class="line-through decoration-base-content/30">{#if entry(r)}<Term term={r} />{:else}{r}{/if}</span>{/each}
								<span>({t.retired.why})</span>
							</p>
						{/if}
					</div>

					<div class="flex flex-col gap-4">
						<div class="reveal rounded-md border border-base-300/60 bg-base-200/50 p-5 backdrop-blur-sm sm:p-7">
							<p class="mb-4 flex flex-wrap items-baseline justify-between gap-2 text-xs tracking-wide text-base-content/45 uppercase">
								<span>Example task</span><span class="normal-case tracking-normal">in the style of <Term term={t.styleOf} /> · made up for this page</span>
							</p>
							<Example kind={t.id} />
							<p class="mt-5 border-t border-base-300/60 pt-4 text-sm text-pretty text-base-content/65">
								<span class="font-medium text-base-content">How it’s graded:</span> <Gloss text={t.graded} />
							</p>
						</div>

						<div class="reveal rounded-md border border-base-300/60 bg-base-200/50 p-5 backdrop-blur-sm sm:p-7">
							<p class="text-xs tracking-wide text-base-content/45 uppercase">Reading a score</p>
							<p class="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<span class="text-lg"><Gloss text={t.claim.bench} /></span>
								<span class="font-serif text-5xl leading-none italic tabular-nums">{t.claim.score}</span>
								{#if t.claim.extra}<span class="text-sm text-base-content/55"><Gloss text={t.claim.extra} /></span>{/if}
							</p>
							<p class="mt-1 text-xs text-base-content/40">A made-up result, as a launch post might print it.</p>
							<ol class="mt-6 flex flex-col gap-4">
								{#each t.steps as step, j (j)}
									{@const [lead, ...rest] = step.split('. ')}
									<li class="flex gap-4">
										<span class="grid size-7 shrink-0 place-items-center rounded-full border border-base-content/25 text-xs font-medium tabular-nums">{j + 1}</span>
										<span class="pt-0.5 text-[15px] leading-snug text-pretty text-base-content/65">
											{#if rest.length}<span class="font-medium text-base-content"><Gloss text={lead} />.</span> <Gloss text={rest.join('. ')} />{:else}<Gloss text={step} />{/if}
										</span>
									</li>
								{/each}
							</ol>
						</div>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<!-- 3. Noise -->
	<section id="noise" class="mt-16 scroll-mt-28">
		<div class="reveal mb-8 max-w-2xl">
			<p class="text-sm tracking-wide text-base-content/45 uppercase">03 · Noise</p>
			<h3 class="mt-2 text-3xl leading-tight sm:text-4xl">Small tests can’t tell close models apart.</h3>
			<p class="mt-3 text-pretty text-base-content/60">
				A score depends on which questions happen to go the model’s way. The fewer questions, the wider that wobble. Pick a benchmark and drag the gap to see
				when a lead stops being luck.
			</p>
		</div>
		<div class="reveal"><NoiseLab /></div>
	</section>

	<!-- 4. Attempts -->
	<section id="attempts" class="mt-28 scroll-mt-28">
		<div class="reveal mb-8 max-w-2xl">
			<p class="text-sm tracking-wide text-base-content/45 uppercase">04 · Attempts</p>
			<h3 class="mt-2 text-3xl leading-tight sm:text-4xl">The same runs can score 25%, 50% or 75%.</h3>
			<p class="mt-3 text-pretty text-base-content/60">
				Models don’t give the same answer every time, so serious evaluations run each task more than once. How those tries are counted changes the headline number, and the label for it
				is usually in a footnote.
			</p>
		</div>
		<div class="reveal"><Attempts /></div>
	</section>

	<!-- 5. Where to check -->
	<section id="check" class="mt-28 scroll-mt-28">
		<div class="reveal mb-8 max-w-2xl">
			<p class="text-sm tracking-wide text-base-content/45 uppercase">05 · Where to check</p>
			<h3 class="mt-2 text-3xl leading-tight sm:text-4xl">Three independent scoreboards.</h3>
			<p class="mt-3 text-pretty text-base-content/60">
				Launch charts are self-reported: the AI company picks the tests, the settings and the comparisons. These sites rerun models themselves, the same way every
				time. When their numbers and a launch chart disagree, trust them. Check them after a big launch, and use what you learned above to read them.
			</p>
		</div>
		<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each HUBS as h (h.name)}
				<li class="reveal">
					<a
						href={h.href}
						target="_blank"
						rel="noopener noreferrer"
						class="group flex h-full flex-col rounded-md border border-base-300/60 bg-base-200/50 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-base-content/30 hover:bg-base-200/80"
					>
						<span class="flex items-start justify-between gap-3">
							<span class="text-xl leading-tight font-medium">{h.name}</span>
							<span class="text-base-content/35 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-base-content">↗</span>
						</span>
						<span class="mt-2 text-[15px] leading-snug text-pretty text-base-content/60"><Gloss text={h.bestFor} /></span>
						<span class="mt-auto pt-4 text-xs text-base-content/40">{host(h.href)}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<!-- 6. Cheat sheet -->
	<section id="cheatsheet" class="mt-28 scroll-mt-28">
		<div class="reveal rounded-md border border-base-300/60 bg-base-200/50 p-6 backdrop-blur-sm sm:p-10">
			<p class="text-sm tracking-wide text-base-content/45 uppercase">06 · Cheat sheet</p>
			<h3 class="mt-2 font-serif text-4xl leading-none tracking-normal italic sm:text-5xl">Six checks before you believe a number.</h3>
			<ol class="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each cheats as [k, v], i (k)}
					<li class="flex gap-4">
						<span class="font-serif text-3xl leading-none text-base-content/30 italic tabular-nums">{i + 1}</span>
						<span>
							<span class="block font-medium">{k}</span>
							<span class="mt-0.5 block text-[15px] leading-snug text-pretty text-base-content/60">{v}</span>
						</span>
					</li>
				{/each}
			</ol>
			<p class="mt-8 border-l-2 border-primary/60 pl-3 text-pretty text-base-content/80">
				<span class="font-medium text-base-content">Most of all:</span> ask how much the tasks look like what you’d use the model for.
			</p>
		</div>
	</section>

	<!-- 7. Glossary -->
	<section id="glossary" class="mt-28 scroll-mt-28">
		<div class="reveal mb-8 max-w-2xl">
			<p class="text-sm tracking-wide text-base-content/45 uppercase">07 · Glossary</p>
			<h3 class="mt-2 text-3xl leading-tight sm:text-4xl">Every term on this page, in plain words.</h3>
			<p class="mt-3 text-pretty text-base-content/60">Dotted-underlined words above show these on hover or tap.</p>
		</div>
		<dl class="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each glossary as e (e.term)}
				<div class="reveal border-t border-base-300/60 pt-4">
					<dt class="font-medium">{e.term}</dt>
					{#if e.full}<dd class="mt-0.5 text-xs text-base-content/45">{e.full}</dd>{/if}
					<dd class="mt-1.5 text-[15px] leading-snug text-pretty text-base-content/60">{e.def}</dd>
				</div>
			{/each}
		</dl>
	</section>
</Note>
