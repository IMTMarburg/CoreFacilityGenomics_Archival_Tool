<script lang="ts">
  export let data;
  export let label = null;

  function hide_all_hoverables() {
    let hoverables = document.getElementsByClassName("hoverable");
    for (let i = 0; i < hoverables.length; i++) {
      hoverables[i].style.display = "none";
    }
  }
  function show_next_sibling(event) {
    event.stopPropagation();
    hide_all_hoverables();
    let target = event.target;
    let next_sibling = target.nextElementSibling;
    if (next_sibling) {
      next_sibling.style.display = "block";
    }
  }
  function hide_next_sibling(event) {
    let target = event.target;
    let next_sibling = target.nextElementSibling;
    if (next_sibling) {
      next_sibling.style.display = "none";
    }
  }
</script>

<svelte:body on:click={hide_all_hoverables} />

<a on:click={show_next_sibling}>
  {#if label}{label}
  {:else}
    {data.name}
  {/if}
</a>
<div class="hoverable">
  <b>{data.name}</b>
  <pre>
	{data.sample_sheet.trim()}
	</pre>
</div>

<style>
  .hoverable {
    display: none;
    position: absolute;
    background-color: white;
	z-index:9;
    border: 1px dashed grey;
    padding: 1em;
    border-radius: 0.5em;
	margin-left:1em;
  }
  pre {
    margin-top: 0;
    padding-top: 0;
  }
</style>
