<script lang="ts">

  export let text = "";
  export let threshold = 300;
  let show_long = false;

</script>

<div>
{#if text.length > threshold }
	{#if show_long}
	<div class="long" on:dblclick={() => {show_long = false}}>
	{@html text}
	</div>
	{:else}
	  <div class="short" on:click={() => {show_long = true}}>
	  {@html text.substring(0, threshold)}...
	  </div>
  {/if}
  {:else}
  <div class="long">
  {@html text}
  </div>
{/if}
</div>
