<script lang="ts">
	import { inlineTokens, linkHost, type Token } from '#lib/inline-md.js';

	// Renders stored markdown as Svelte text, so the only markup is what the tokens produce here.
	// Links show their host unless the label already is it. Lines are joined with <br>. With `paragraphs`, blank lines split the text into <p>s; without, it stays inline.
	let { md, paragraphs = false }: { md: string; paragraphs?: boolean } = $props();

	const blocks = $derived((paragraphs ? md.split(/\n\s*\n/) : [md]).map((b) => b.split(/\n\s*/).map(inlineTokens)));
</script>

{#snippet lines(ls: Token[][])}
	{#each ls as tokens, i (i)}{#if i}<br />{/if}{#each tokens as t, j (j)}{#if t.type === 'link'}<a href={t.url} rel="noopener noreferrer">{t.text}</a>{@const host = linkHost(t.text, t.url)}{#if host}{' '}<span class="text-[0.8em] text-base-content/50">({host})</span>{/if}{:else if t.type === 'strong'}<strong>{t.text}</strong>{:else if t.type === 'code'}<code>{t.text}</code>{:else}{t.text}{/if}{/each}{/each}
{/snippet}

{#each blocks as b, i (i)}{#if paragraphs}<p>{@render lines(b)}</p>{:else}{@render lines(b)}{/if}{/each}
