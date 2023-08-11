<script lang="ts">

  export let text = "";
  let show_long = false;

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
{show_long}
