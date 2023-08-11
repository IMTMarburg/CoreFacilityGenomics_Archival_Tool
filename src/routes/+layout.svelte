<script lang="ts">
  import { base } from "$app/paths";
  export let data;
</script>


<svelte:head>
</svelte:head>
<h1><a href="../">Sequencer archival tool</a>
</h1>
{#if data.fake_date}
	<b style="color:red;">Fake date in effect: {data.fake_date}</b>
{/if}
<slot />
