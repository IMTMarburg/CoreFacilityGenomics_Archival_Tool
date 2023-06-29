<script lang="ts">
  import { event_details, hash_string } from "$lib/util";
  import RunDisplay from "$lib/components/RunDisplay.svelte";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import * as EmailValidator from "email-validator";
  export let data;
  export let form;

  let show_all = false;

  function escape_name(name: string) {
    //escape for use in html id
    //hash name
    return (
      name.replace(/[^a-zA-Z0-9]/g, "_") + hash_string(name).then().catch()
    );
  }
</script>

<h1>Annotate run</h1>

<p>
Here you can add the initial meta data to each run, 
mark it as ready for download, and send an email to the user.
</p>

<h2>Unannotated</h2>
{#if Object.keys(data.unannotated_runs).length > 0}
	<ul>
      {#each Object.keys(data.unannotated_runs) as run}
		  <li class="evenodd"><a href="annotate_run/{run}">{run}</a></li>
	  {/each}
	  </ul>
	{:else}
		No runs currently unannotated.
{/if}

<h2>Previously annotated</h2>

<!-- lazy loading -->

{#if show_all}
	<ul>
	  {#each Object.keys(data.annotatable_runs) as run}
		  <li class="evenodd"><a href="annotate_run/{run}">{run}</a></li>
	  {/each}
	  </ul>
  {:else}
<a href="#annotated" on:click={() => {show_all = true;}}>(Click to load list)</a>
{/if}


<style>
  th,
  td {
    vertical-align: top;
    padding: 0.5em;
  }

  th {
    text-align: right;
  }
  li {
    vertical-align: top;
    list-style-type: none;
  }
  /* alternate row colors */
  tr:nth-child(even) {
    background-color: #eee;
  }

  .error {
    color: red;
  }

  label {
    padding-left: 0.5em;
    padding-right: 0.5em;
  }
  :global(.radio-toolbar input[type="radio"]:checked + label) {
    background-color: #d0d0ff;
  }

  .inline_submit {
    padding-left: 0.1em;
    padding-right: 0.1em;
    padding-top: 0;
    padding-bottom: 0;
    display: inline;
  }
</style>
