<script lang="ts">
  import {
    format_date_and_period,
    format_timestamp,
    event_details,
    hash_string,
  } from "$lib/util";
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

<h1>Delete from working dataset</h1>

<form method="POST" action="?/delete">
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  Delete:
  {#if data.runs.length == 0}
    No runs available for deletion
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
              Finish date: {format_date_and_period(run.run_finish_date)}
              <br />
              {#if run.archive_date}
                Archive date: {format_date_and_period(run.archive_date)}
              {:else}
                Not archived
              {/if}
            </p>
          </label>
        </li>
      {/each}
    </ul>
    <input type="submit" value="Delete" class="danger"/>
  {/if}
</form>

<h2>Currently pending deletions</h2>
{#if data.open_deletions.length == 0}
  None
{:else}
  <table>
	<tr>
	  <th>Run</th>
	  <th>Finish date</th>
	  <th>Archive date</th>
	  <th>Request on</th>
	  <th>Status</th>
	</tr>
	{#each data.open_deletions as task}
	  <tr>
		<td>{task.run}</td>
		<td>{format_date_and_period(task.run_finish_date)}</td>
		<td>{task.archive_date? format_date_and_period(task.archive_date): '-'}</td>
		<td>{format_timestamp(task.timestamp)}</td>
		<td>{task.status}
		{#if task.status == "open"}
			<form method="POST" action="?/abort">
			  <input type="hidden" name="run" value={task.run} />
			  <input type="submit" class="inline_submit" value="Abort" />
			  </form>
		{/if}
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
	padding-left:.1em;
	padding-right:.1em;
	padding-top:0;
	padding-bottom:0;
	display: inline;
  }
</style>
