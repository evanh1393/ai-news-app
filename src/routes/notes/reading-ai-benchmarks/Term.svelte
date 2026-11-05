<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { entry } from './glossary';

	// A glossary term: dotted underline, definition in a floating card on hover, focus or tap.
	// The card is fixed-positioned and clamped to the viewport, so it works inside cards and on phones.
	let { term, children }: { term: string; children?: Snippet } = $props();
	const e = $derived(entry(term)!);
	const id = $props.id();

	let el: HTMLElement;
	let open = $state(false);
	let pos = $state({ x: 0, y: 0, w: 288, above: false });

	function show() {
		const r = el.getBoundingClientRect();
		const w = Math.min(288, innerWidth - 24);
		const x = Math.min(Math.max(12, r.left), innerWidth - w - 12);
		const above = r.bottom + 200 > innerHeight;
		pos = { x, y: above ? r.top - 8 : r.bottom + 8, w, above };
		open = true;
	}
	const hide = () => (open = false);
</script>

<svelte:window onscroll={hide} />

<span
	bind:this={el}
	class="term"
	role="button"
	tabindex="0"
	aria-describedby={open ? id : undefined}
	onmouseenter={show}
	onmouseleave={hide}
	onfocus={show}
	onblur={hide}
	onclick={(ev) => {
		// Terms sit inside link cards; a tap should explain, not navigate.
		ev.preventDefault();
		ev.stopPropagation();
		open ? hide() : show();
	}}
	onkeydown={(ev) => ev.key === 'Escape' && hide()}>{#if children}{@render children()}{:else}{term}{/if}</span
>{#if open}<span
		{id}
		role="tooltip"
		transition:fade={{ duration: 150 }}
		class="pointer-events-none fixed z-50 block rounded-md border border-base-300 bg-base-200/95 p-4 text-left text-sm leading-snug font-normal tracking-normal text-base-content/75 normal-case shadow-lg backdrop-blur-md"
		style="left: {pos.x}px; top: {pos.y}px; width: {pos.w}px; {pos.above ? 'transform: translateY(-100%)' : ''}"
	>
		<span class="block font-medium text-base-content">{e.term}</span>
		{#if e.full}<span class="mt-0.5 block text-xs text-base-content/50">{e.full}</span>{/if}
		<span class="mt-2 block">{e.def}</span>
	</span>{/if}

<style>
	.term {
		cursor: help;
		text-decoration: underline dotted;
		text-decoration-color: color-mix(in oklab, currentColor 45%, transparent);
		text-underline-offset: 0.2em;
		text-decoration-thickness: 1.5px;
		transition: text-decoration-color 0.2s;
	}
	.term:hover,
	.term:focus-visible {
		text-decoration-color: currentColor;
		outline: none;
	}
</style>
