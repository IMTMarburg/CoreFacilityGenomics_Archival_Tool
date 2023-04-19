<script lang="ts">
  import { format_timestamp, event_details, hash_string } from "$lib/util";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import * as EmailValidator from "email-validator";
  export let data;
  export let form;

  function escape_name(name: string) {
    //escape for use in html id
    //hash name
    return (
      name.replace(/[^a-zA-Z0-9]/g, "_") + hash_string(name).then().catch()
    );
  }
</script>

<h1>Archive from working set</h1>

<form method="POST" action="?/archive">
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  Archive:
  {#if data.runs.length == 0}
    No runs available for archiving
  {:else}
    <ul class="radio-toolbar">
      {#each data.runs as run}
        <li>
          <input
            type="radio"
            name="run"
            id="run_{escape_name(run.name)}"
            value={run.name}
            required
          />
          <label for="run_{escape_name(run.name)}">
            <p>
              Run {run.name}
              <br />
              Finish date: <DatePeriod
                timestamp={run.run_finish_date}
                newline={false}
              />
            </p></label
          >
        </li>
      {/each}
    </ul>
    <input type="submit" value="Archive" name="what" />
    <input
      type="submit"
      value="Archive and Delete"
      name="what"
      class="danger"
    />
  {/if}
</form>

<h2>Currently pending</h2>
{#if data.open_tasks.length == 0}
  None
{:else}
  <table>
    <tr>
      <th>Run</th>
      <th>Finish date</th>
      <th>Archive date</th>
      <th>Delete?</th>
      <th>Request on</th>
      <th>Status</th>
    </tr>
    {#each data.open_tasks as task}
      <tr>
        <td>{task.run}</td>
        <td><DatePeriod timestamp={task.run_finish_date} newline={false} /></td>
        <td><DatePeriod timestamp={task.archive_date} newline={false} /></td>
        <td>{task.delete_after_archive ? "Yes" : "No"}</td>
        <td>{format_timestamp(task.timestamp)}</td>
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
