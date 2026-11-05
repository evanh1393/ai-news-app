<script lang="ts">
	import Term from './Term.svelte';
	import { gloss } from './glossary';

	// Plain text with its glossary terms marked (first mention of each).
	let { text }: { text: string } = $props();
	const parts = $derived(gloss(text));
</script>

{#each parts as p, i (i)}{#if p.term}<Term term={p.term}>{p.text}</Term>{:else}{p.text}{/if}{/each}
