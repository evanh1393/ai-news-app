<script lang="ts">
	import BriefingView from '../BriefingView.svelte';

	let { data } = $props();
</script>

<svelte:head><title>{data.briefing.title}</title></svelte:head>

<p class="mu"><a href="/archive">← Archive</a></p>
<BriefingView briefing={data.briefing} />
