<script lang="ts">
  import { event_details, hash_string } from "$lib/util";
  import RunDisplay from "$lib/components/RunDisplay.svelte";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import * as EmailValidator from "email-validator";
  export let data;
  export let form;
  import { base } from "$app/paths";

  function escape_name(name: string) {
    //escape for use in html id
    //hash name
    return (
      name.replace(/[^a-zA-Z0-9]/g, "_") + hash_string(name).then().catch()
    );
  }
</script>

<h1 class="danger">Remove from archive</h1>

<form method="POST" action="?/archive">
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  {#if data.runs.length == 0}
    No runs available for removal from archive. <br />
    Perhaps check 'archive end date' in <a href="{base}/runs">runs</a>?
  {:else}
    Run to delete:
    <ul class="radio-toolbar">
      {#each data.runs as run}
        <li style="clear:both">
          <div style="float:left">
          <input
            type="radio"
            name="run"
            id="run_{escape_name(run.name)}"
            value={run.name}
            required
          />
          <label for="run_{escape_name(run.name)}">
              Run {run.name}
              <br />
              Finish date: <DatePeriod
                timestamp={run.run_finish_date}
                newline={false}
              /><br />
              Archive date: <DatePeriod
                timestamp={run.archive_date}
                newline={false}
              /><br />
              Archive end_date: <DatePeriod
                timestamp={run.archive_end_date}
                newline={false}
              /><br />
			  Currently in working set: {@html run.in_working_set ? "Yes" : "<b class=danger>No</b>"}
            </label
          >
   </div>
          <div style="float:left">
            <RunDisplay data={run} label="SampleSheet" />
          </div>

        </li>
      {/each}
    </ul>
	<br style="clear:both"/>	
    <input
      type="submit"
      value="DELETE FROM ARCHIVE"
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
        <td><DatePeriod timestamp={task.run_finish_date} /></td>
        <td>
          <DatePeriod timestamp={task.archive_date} />
        </td>
        <td>{task.delete_after_archive ? "Yes" : "No"}</td>
      <td><DatePeriod timestamp={task.timestamp} include_time="true" /></td>
        <td
          >{task.status}
          <form method="POST" action="?/abort">
            <input type="hidden" name="run" value={task.run} />
            <input type="submit" class="inline_submit" value="Abort" />
          </form>
        </td>
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

  :global(b.danger) {
	color: red;
  }
</style>
