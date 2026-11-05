// Every acronym and bit of jargon on the page. <Gloss> underlines the first mention of each in a
// block of text and shows the definition on hover or tap; the Glossary section lists them all.

export interface Entry {
	term: string;
	/** What the acronym stands for, if it is one. */
	full?: string;
	def: string;
	/** Exact spellings to underline in running text (case-sensitive). Defaults to [term]. */
	match?: string[];
}

export const GLOSSARY: Entry[] = [
	// Benchmarks and organizations
	{ term: 'AIME', full: 'American Invitational Mathematics Examination', def: 'An invitation-only US math competition for top high-school students. Two papers a year, 15 problems each, every answer a whole number from 0 to 999.' },
	{ term: 'ARC-AGI', full: 'Abstraction and Reasoning Corpus for Artificial General Intelligence', def: 'Colored-grid puzzles where you infer a rule from a few examples. Run by the nonprofit ARC Prize Foundation.', match: ['ARC-AGI-2', 'ARC-AGI-1', 'ARC-AGI'] },
	{ term: 'Elo', def: 'A rating system from chess. Two players’ rating gap predicts how often one beats the other; LMArena uses the same idea for models.' },
	{ term: 'Epoch AI', def: 'An independent research group that tracks AI progress and runs benchmarks on new models itself.', match: ['Epoch AI', 'Epoch'] },
	{ term: 'GDPval', full: 'GDP (gross domestic product) evaluation', def: 'OpenAI’s test of economically valuable work: real deliverables from 44 occupations, graded by professionals in each field.' },
	{ term: 'GPQA', full: 'Graduate-Level Google-Proof Q&A', def: 'Hard science questions written by PhD students and experts. “Diamond” is the hardest, cleanest 198-question subset.', match: ['GPQA Diamond', 'GPQA'] },
	{ term: 'GSM8K', full: 'Grade School Math 8K', def: 'About 8,500 grade-school math word problems. Solved by today’s models.' },
	{ term: 'HellaSwag', def: 'A 2019 test of commonsense: pick the most sensible ending to a short scenario. Solved by today’s models.' },
	{ term: 'HLE', full: 'Humanity’s Last Exam', def: 'About 2,500 expert-written questions across many fields, built in 2025 to be hard for the best models.', match: ['Humanity’s Last Exam', 'HLE'] },
	{ term: 'HMMT', full: 'Harvard-MIT Mathematics Tournament', def: 'A long-running math competition for high-school students, run by Harvard and MIT students.' },
	{ term: 'FrontierMath', def: 'Epoch AI’s set of unpublished problems written by mathematicians, from hard competition level up to research level.' },
	{ term: 'HumanEval', def: 'OpenAI’s 2021 set of 164 short Python programming problems. Solved and widely leaked.' },
	{ term: 'LMArena', full: 'Language Model Arena', def: 'A site where people vote between two anonymous chatbot answers. Formerly called Chatbot Arena.' },
	{ term: 'LiveCodeBench', def: 'Programming-contest problems collected continuously, so a model can be tested only on problems newer than its training data.' },
	{ term: 'MATH', def: 'A 2021 set of 12,500 competition math problems. Solved by today’s models.' },
	{ term: 'MathArena', def: 'A project that tests models on each new math competition right after it happens, so the problems can’t be in their training data.' },
	{ term: 'MBPP', full: 'Mostly Basic Python Problems', def: 'About 1,000 entry-level Python tasks. Solved by today’s models.' },
	{ term: 'METR', full: 'Model Evaluation & Threat Research', def: 'A nonprofit that measures what AI systems can do on long, realistic tasks.' },
	{ term: 'MMLU', full: 'Massive Multitask Language Understanding', def: 'A 2020 test of about 14,000 four-choice questions across 57 school and professional subjects.' },
	{ term: 'MMLU-Pro', full: 'MMLU, Professional', def: 'A harder MMLU with ten answer choices per question instead of four.' },
	{ term: 'MMMU', full: 'Massive Multi-discipline Multimodal Understanding', def: 'College-level questions that each come with an image, such as a chart, diagram or photo.' },
	{ term: 'OSWorld', full: 'Operating System World', def: 'A test where the model uses a real computer desktop (apps, browser, files) to finish tasks.' },
	{ term: 'SimpleQA', full: 'Simple question answering', def: 'OpenAI’s set of about 4,300 short fact questions with one clear answer, asked without web access. “SimpleQA Verified” is a cleaned-up version.', match: ['SimpleQA Verified', 'SimpleQA'] },
	{ term: 'SWE-bench', full: 'Software Engineering benchmark', def: 'Real bug reports from open-source projects; the model must change the code so the project’s tests pass. “Verified” is a 500-task subset checked by people; “Pro” is a harder successor.' },
	{ term: 'τ-bench', full: 'tau-bench, for tool–agent–user', def: 'Sierra’s test of a customer-service agent that must use tools and follow company rules while talking to a simulated customer. τ²-bench (“tau-two”) is the second version.', match: ['τ²-bench', 'τ-bench'] },
	{ term: 'Terminal-Bench', def: 'Tasks done by typing commands into a Linux terminal, checked by tests afterwards.' },

	// How scores are made and read
	{ term: 'agent', def: 'A model set up to take actions in a loop (run code, click, search) until a task is done, rather than answering once.', match: ['agents', 'agent', 'Agents'] },
	{ term: 'calibration', def: 'Whether a model’s confidence matches reality: things it says it’s 90% sure of should be right about 90% of the time.', match: ['calibration', 'Calibration'] },
	{ term: 'chance floor', def: 'The score you’d get by guessing at random: 25% with four choices, 10% with ten. Only the part above it shows skill.', match: ['chance floor', 'chance'] },
	{ term: 'cons@64', full: 'consensus at 64', def: 'Ask 64 times and score the most common answer. Also written maj@64 (majority). Scores higher than one try.', match: ['cons@64', 'maj@64'] },
	{ term: 'contamination', def: 'When test questions (or their answers) ended up in a model’s training data, so a high score may be memory rather than skill.', match: ['contamination', 'leaked'] },
	{ term: 'frontier model', def: 'One of the newest, most capable models from the leading labs.', match: ['frontier models', 'frontier model', 'frontier'] },
	{ term: 'hallucinate', def: 'When a model states something false as if it were fact.', match: ['hallucinate'] },
	{ term: 'harness', def: 'The software wrapped around a model for a test: its tools, instructions, step limits and retry rules. Also called a scaffold. Change it and the score changes.', match: ['harness', 'scaffolding'] },
	{ term: 'held-out', def: 'Kept private and never published, so no model could have trained on it.', match: ['held-out', 'hidden test set'] },
	{ term: 'one-shot', def: 'Done in a single attempt, with no chance to ask questions or revise.' },
	{ term: 'pass@1', def: 'The share of tasks solved on the first try. The standard, fairest number.' },
	{ term: 'pass@k', def: 'The share of tasks solved by at least one of k tries (pass@8: any of 8). Flatters the model.', match: ['pass@k', 'pass@8'] },
	{ term: 'pass^k', def: 'The share of tasks solved on every one of k tries. Measures reliability, so it’s lower than pass@1.', match: ['pass^k', 'pass^8', 'pass^4', 'pass^1'] },
	{ term: 'saturated', def: 'A benchmark is saturated when the top models all score near the maximum, so it can no longer tell them apart.', match: ['Saturated', 'saturated', 'Saturation'] },
	{ term: 'style control', def: 'An LMArena view that adjusts ratings for answer length and formatting, which otherwise sway votes.' },
	{ term: 'test-time compute', def: 'Extra computing spent while answering, such as thinking longer or trying many answers in parallel and picking one.', match: ['parallel test-time compute', 'test-time compute', 'extra compute'] },
	{ term: 'time horizon', def: 'METR’s measure: the length of task, in how long a skilled person takes, that a model completes a given share of the time.' },
	{ term: 'training cutoff', def: 'The date after which a model saw no new data. Anything published later can’t be in its training.', match: ['training cutoff', 'training data'] },

	// General tech
	{ term: 'GitHub issue', def: 'A bug report or feature request filed on a project hosted on GitHub, the main site for sharing code.', match: ['GitHub issues', 'GitHub issue'] },
	{ term: 'patch', def: 'A set of changes to code, here the model’s proposed fix.' },
	{ term: 'Python', def: 'A popular programming language.' },
	{ term: 'terminal', def: 'A text window where you control a computer by typing commands.', match: ['Linux terminal', 'terminal'] },
	{ term: 'virtual machine', def: 'A simulated computer running inside another one, so tests can’t harm anything real.' }
];

const byKey = new Map(GLOSSARY.map((e) => [e.term, e]));
export const entry = (term: string) => byKey.get(term);

// One regex over every spelling, longest first so “MMLU-Pro” wins over “MMLU”.
const spellings = GLOSSARY.flatMap((e) => (e.match ?? [e.term]).map((s) => [s, e.term] as const)).sort((a, b) => b[0].length - a[0].length);
const termOf = new Map(spellings);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE = new RegExp(`(?<![\\w@^])(${spellings.map(([s]) => esc(s)).join('|')})(?![\\w@^])`, 'g');

export type Part = { text: string; term?: string };

/** Split text into plain runs and glossary terms, marking only the first mention of each term. */
export function gloss(text: string): Part[] {
	const parts: Part[] = [];
	const seen = new Set<string>();
	let last = 0;
	for (const m of text.matchAll(RE)) {
		const term = termOf.get(m[0])!;
		if (seen.has(term)) continue;
		seen.add(term);
		if (m.index > last) parts.push({ text: text.slice(last, m.index) });
		parts.push({ text: m[0], term });
		last = m.index + m[0].length;
	}
	if (last < text.length) parts.push({ text: text.slice(last) });
	return parts;
}
