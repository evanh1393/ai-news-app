<script lang="ts">
	import BriefingView from '../BriefingView.svelte';

	let { data } = $props();
</script>

<svelte:head><title>{data.briefing.title}</title></svelte:head>

<p class="mb-6 text-sm font-medium"><a class="opacity-50 transition-opacity hover:opacity-100" href="/archive">← Archive</a></p>
<BriefingView briefing={data.briefing} />
