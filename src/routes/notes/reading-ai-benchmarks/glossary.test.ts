import { expect, test } from 'vitest';
import { GLOSSARY, gloss } from './glossary';

const marked = (text: string) => gloss(text).filter((p) => p.term).map((p) => [p.text, p.term]);

test('longest spelling wins, and each term is marked once per block', () => {
	expect(marked('MMLU-Pro replaced MMLU, and MMLU is saturated. Saturated, really.')).toEqual([
		['MMLU-Pro', 'MMLU-Pro'],
		['MMLU', 'MMLU'],
		['saturated', 'saturated']
	]);
});

test('variants map to their entry; words inside other words are left alone', () => {
	expect(marked('ARC-AGI-2 at pass@8, not pass^8 or passage')).toEqual([
		['ARC-AGI-2', 'ARC-AGI'],
		['pass@8', 'pass@k'],
		['pass^8', 'pass^k']
	]);
	expect(marked('Mathematics and patches')).toEqual([]);
});

test('text survives the split unchanged', () => {
	const s = 'On SWE-bench Verified, the harness matters; check the GitHub issues.';
	expect(gloss(s).map((p) => p.text).join('')).toBe(s);
});

test('terms are unique', () => {
	const terms = GLOSSARY.map((e) => e.term);
	expect(new Set(terms).size).toBe(terms.length);
});
