<script lang="ts">
  import Expander from "$lib/components/Expander.svelte";

export let object = {};
</script>
<table>
<tr>
  <th>Key</th>
  <th>Value</th>
  </tr>
{#each Object.keys(object) as key}
<tr>
  <td>{key}</td>
  <td>
	{#if typeof object[key] == "object"}
	<Expander threshold=50 text={'<pre>' + JSON.stringify(object[key], null, 2) + '</pre>'} />
	{:else if typeof object[key] == "string"}
	<Expander threshold=50 text={'<pre>' + object[key]+ '</pre>'} />
	{:else}
	  {object[key]}
	{/if}
  </td>
  </tr>
{/each}
</table>


<style>
td {
	text-align:left;
}
</style>
