<script lang="ts">
	import BriefingView from '../BriefingView.svelte';

	let { data } = $props();
</script>

<svelte:head><title>{data.briefing.title}</title></svelte:head>

<p class="text-sm"><a class="link link-primary" href="/archive">← Archive</a></p>
<BriefingView briefing={data.briefing} />
