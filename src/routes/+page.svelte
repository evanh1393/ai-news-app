<script lang="ts">
	import BriefingView from './briefing/BriefingView.svelte';

	let { data } = $props();
</script>

{#if data.briefing}
	<BriefingView briefing={data.briefing} />
{:else}
	<p>No briefings yet.</p>
{/if}
