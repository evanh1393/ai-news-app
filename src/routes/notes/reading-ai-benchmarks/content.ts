// Content for the benchmarks note. Each type teaches through a made-up example task in the style of a
// well-known benchmark, then a sample score read step by step. Deliberately few outside links and no
// live scores: they go stale and need re-checking. HUBS is the only list of links to maintain.

export type Glyph = 'knowledge' | 'novel' | 'math' | 'coding' | 'agents' | 'facts' | 'preference';

export interface BenchType {
	id: Glyph;
	name: string;
	short: string;
	tests: string;
	/** Well-known benchmarks of this type (glossary terms where possible). */
	family: string[];
	/** The benchmark the example task imitates. */
	styleOf: string;
	graded: string;
	/** A sample headline score, as a launch post would print it. */
	claim: { bench: string; score: string; extra?: string };
	/** Reading that score, one step at a time. */
	steps: string[];
	retired?: { names: string; why: string };
}

export const TYPES: BenchType[] = [
	{
		id: 'knowledge',
		name: 'Knowledge exams',
		short: 'Expert questions',
		tests: 'Whether the model knows expert material and can reason with it: multiple-choice and short-answer questions across science, law, medicine and more, some with images.',
		family: ['GPQA', 'HLE', 'MMLU-Pro', 'MMMU'],
		styleOf: 'GPQA',
		graded: 'The model picks one letter, and it’s compared with the answer key. Right or wrong, nothing in between.',
		claim: { bench: 'GPQA Diamond', score: '84%' },
		steps: [
			'84% means 166 of the 198 questions answered correctly.',
			'Find the floor and the ceiling. Guessing scores 25%; PhD experts score about 65% in their own field. So 84% is well above both.',
			'Allow for noise. With only 198 questions a score wobbles by about ±5 points, so 82% and 86% are a tie.',
			'Read the footnote. One try, or the majority answer of many (cons@64)? With web search, or without?'
		],
		retired: { names: 'MMLU · HellaSwag', why: 'saturated; leading with them is a tell' }
	},
	{
		id: 'novel',
		name: 'Novel puzzles',
		short: 'Rules never seen',
		tests: 'Whether the model can work out a new rule from a couple of examples: a skill it can’t have memorized from training data.',
		family: ['ARC-AGI'],
		styleOf: 'ARC-AGI',
		graded: 'The model draws the whole output grid. Every cell has to match; one wrong cell and the puzzle counts as failed. Two attempts are allowed.',
		claim: { bench: 'ARC-AGI-2', score: '45%', extra: 'at $8 per task' },
		steps: [
			'45% means the system drew 45 of every 100 hidden puzzles exactly right.',
			'Read the cost. The leaderboard plots score against dollars per puzzle; the same 45% at 20¢ would be a far bigger result.',
			'Check it’s verified. Only scores on the hidden test set count. A company’s own number on the public puzzles may have seen them in training.',
			'Remember the human bar. People solved every puzzle in testing, so the gap to 100% is real.'
		],
		retired: { names: 'ARC-AGI-1', why: 'largely solved by reasoning models' }
	},
	{
		id: 'math',
		name: 'Math',
		short: 'Checkable answers',
		tests: 'Multi-step problem solving where each problem has one exact answer, from olympiad-style competitions up to research-level mathematics.',
		family: ['AIME', 'HMMT', 'FrontierMath'],
		styleOf: 'AIME',
		graded: 'Only the final number is checked against the answer. The working isn’t graded, and partial credit doesn’t exist.',
		claim: { bench: 'AIME 2026', score: '93%' },
		steps: [
			'93% is 28 of 30 problems. One problem is worth 3.3 points, so 93% vs 90% is a single problem.',
			'Check the year. 2026 problems are fresh; problems from earlier years are almost certainly in training data.',
			'Count the attempts. One try averaged over several runs is fair; the majority of 64 tries (cons@64) is flattering.',
			'Don’t stretch it. Competition math is narrow. For research-level math, look at FrontierMath instead.'
		],
		retired: { names: 'GSM8K · MATH', why: 'saturated' }
	},
	{
		id: 'coding',
		name: 'Coding',
		short: 'Hidden tests decide',
		tests: 'Whether the model writes code that works, judged by tests it can’t see: from fixing real bugs in large projects to driving a terminal.',
		family: ['SWE-bench', 'Terminal-Bench', 'LiveCodeBench'],
		styleOf: 'SWE-bench',
		graded: 'The model gets the project and the GitHub issue, and writes a patch. Hidden tests then run: the ones the fix should make pass, and the ones that passed before. Every one must pass.',
		claim: { bench: 'SWE-bench Verified', score: '74%' },
		steps: [
			'74% means 370 of 500 real GitHub issues fixed, with every hidden test passing.',
			'Allow for noise. On 500 tasks, scores wobble by about ±4 points.',
			'Find the harness and the tries. Look for “parallel test-time compute” or “best of k” in the footnotes.',
			'Compare like with like: same harness, same variant. Pro scores run far below Verified.'
		],
		retired: { names: 'HumanEval · MBPP', why: 'saturated and leaked' }
	},
	{
		id: 'agents',
		name: 'Agents & computer use',
		short: 'Takes actions',
		tests: 'Multi-step tasks where the model acts: calls tools, clicks through apps, browses the web and follows rules, sometimes for hours.',
		family: ['τ-bench', 'OSWorld', 'METR'],
		styleOf: 'τ-bench',
		graded: 'Afterwards the booking system is checked against the right end state. Saying the right thing isn’t enough: the right actions have to happen, and the company’s rules have to be followed.',
		claim: { bench: 'τ²-bench airline', score: '71%', extra: 'pass^1 · 48% pass^4' },
		steps: [
			'pass^1 of 71% means 71% of conversations ended with the system in the right state.',
			'pass^4 of 48% means fewer than half the tasks went right all four times they were run. For anything unattended, that’s the number to trust.',
			'Check the limits: how many steps, which tools, which domain (retail, airline, telecom).',
			'For long jobs, ask a different question. METR’s time horizon measures how long a task the model can finish half the time.'
		],
	},
	{
		id: 'facts',
		name: 'Factuality',
		short: 'True, or “I don’t know”',
		tests: 'Whether the model’s answers are true, and whether it says so when it doesn’t know instead of making something up.',
		family: ['SimpleQA', 'HLE'],
		styleOf: 'SimpleQA',
		graded: 'Each answer is graded correct, incorrect or not attempted. Saying “I don’t know” isn’t counted as wrong.',
		claim: { bench: 'SimpleQA', score: '55%', extra: 'correct' },
		steps: [
			'55% right tells you half the story. Find out whether the other 45% was wrong or not attempted.',
			'Compare two models. A: 55 right, 40 wrong, 5 skipped. B: 50 right, 10 wrong, 40 skipped. B scores lower but makes things up four times less often.',
			'With search or without? With browsing it’s a research test, not a memory test.',
			'Look for calibration: when the model says it’s 90% sure, is it right 90% of the time? Humanity’s Last Exam reports this.'
		],
	},
	{
		id: 'preference',
		name: 'Preference & real work',
		short: 'Would a person pick it',
		tests: 'Whether people prefer the model’s answers, and whether its work holds up next to what a professional would deliver.',
		family: ['LMArena', 'GDPval'],
		styleOf: 'LMArena',
		graded: 'There’s no answer key. A person picks the answer they like better, without knowing which model wrote it, and thousands of votes become a rating, as in chess.',
		claim: { bench: 'LMArena', score: '1420', extra: 'rank #1' },
		steps: [
			'1420 is a rating, not a percentage. A 100-point lead means winning about 64% of votes; a 20-point lead, 53%, barely better than a coin flip.',
			'Check the ± next to each rating. The top few models often overlap, which makes “#1” a tie.',
			'Turn on style control. Longer, better-formatted answers win votes without being more correct.',
			'Preference isn’t correctness. For real work, GDPval compares the model’s deliverables with a professional’s.'
		],
	}
];

/** Independent scoreboards: the page's only outside links. Big, long-running sites, so they rarely break. */
export const HUBS = [
	{
		name: 'Epoch AI',
		href: 'https://epoch.ai/benchmarks',
		bestFor: 'Reruns the major benchmarks on every new model under one set of settings: the closest thing to a neutral scoreboard.'
	},
	{
		name: 'Artificial Analysis',
		href: 'https://artificialanalysis.ai',
		bestFor: 'Runs its own tests and puts the results next to price and speed, so you can see which model is the best value.'
	},
	{
		name: 'LMArena',
		href: 'https://lmarena.ai/leaderboard',
		bestFor: 'What people actually prefer, broken down by task. Turn on style control.'
	}
];

export const host = (href: string) => new URL(href).hostname.replace(/^www\./, '');
