<script lang="ts">
	import BriefingView from '../BriefingView.svelte';

	let { data } = $props();
</script>

<svelte:head><title>{data.briefing.title}</title></svelte:head>

<p class="mx-auto mb-6 max-w-3xl text-sm font-medium"><a class="opacity-50 transition-opacity hover:opacity-100" href="/archive">← Archive</a></p>
<BriefingView briefing={data.briefing} />
