<script lang="ts">
  import { event_details, hash_string } from "$lib/util";
  import RunDisplay from "$lib/components/RunDisplay.svelte";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import * as EmailValidator from "email-validator";
  export let data;
  export let form;
</script>

<h1>Trigger date sorting</h1>

<p>
This job goes through all runs in the main folder,
and sorts them into YYYY subfolders.

<form method="POST" action="?/archive">
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

    <br style="clear:both" />
    <input type="submit" value="Request sort" name="what" />
</form>

<h2>Currently pending</h2>
{#if data.open_tasks.length == 0}
  None
{:else}
  <table>
    <tr>
      <th>Request on</th>
      <th>Status</th>
    </tr>
    {#each data.open_tasks as task}
      <tr>
        <td><DatePeriod timestamp={task.timestamp} include_time="true" /></td>
        <td>{task.status} </td>
      </tr>
    {/each}
  </table>
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
