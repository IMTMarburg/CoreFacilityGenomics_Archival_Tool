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
  Here you can add the meta data to each run, marke it as 'ready', and send a
  download email to the user.
</p>

<h2>Unannotated</h2>
<ul>
  {#if data.unannotated_runs.length > 0}
    {#each data.unannotated_runs as run}
      <li class="evenodd"><a href="annotate_run/{run.name}">{run.name}</a></li>
    {/each}
  {:else}
    <li>No runs currently unannotated.</li>
  {/if}
</ul>

<h2>Unfinished</h2>
<ul>
  {#if data.unfinished_runs.length > 0}
    {#each data.unfinished_runs as run}
      <li class="evenodd"><a href="annotate_run/{run.name}">{run.name}</a></li>
    {/each}
  {:else}
    <li>No runs currently unfinished.</li>
  {/if}
</ul>
<h2>Previously annotated</h2>

<!-- lazy loading -->

<ul>
{#if show_all}
  {#if data.prev_annotated.length > 0}
      {#each data.prev_annotated as run}
        <li class="evenodd">
          <a href="annotate_run/{run.name}">{run.name}</a>
        </li>
      {/each}
  {:else}
	  <li>No runs previously annotated.</li>
  {/if}
{:else}
	<li>
  <a
    href="#annotated"
    on:click={() => {
      show_all = true;
    }}>(Click to load list)</a
  >
  </li>
{/if}
</ul>

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
