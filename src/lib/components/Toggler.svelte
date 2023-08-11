<script lang="ts">

  export let text = "";
  export let expanded = false;
  let show_long = expanded == "true";

function toggleDisplay() {
    show_long = !show_long;
  }
</script>

<div>
{#if show_long}
	<a href="#" on:click|preventDefault={toggleDisplay}>{text}</a> <br />
	<slot></slot>
{:else}
		<a href="#" on:click|preventDefault={toggleDisplay}>{text}</a> 
{/if}
</div>
