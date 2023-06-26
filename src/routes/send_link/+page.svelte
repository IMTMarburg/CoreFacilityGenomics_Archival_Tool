<script lang="ts">
  import { base } from "$app/paths";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import RunDisplay from "$lib/components/RunDisplay.svelte";
  import { iso_date, event_details, hash_string } from "$lib/util";
  import * as EmailValidator from "email-validator";
  export let data;
  export let form;

  let chosen_run = form?.run ?? [];

  function escape_name(name: string) {
    //escape for use in html id
    //hash name
    return (
      name.replace(/[^a-zA-Z0-9]/g, "_") + hash_string(name).then().catch()
    );
  }

  function plus_days(date: Date, days: number) {
    const new_date = new Date(date);
    new_date.setDate(new_date.getDate() + days);
    return new_date;
  }

  function forward_complete_click(ev) {
	  let run = this.value.split("___")[0];
	  //now find each input that starts with that value
	  let inputs = document.querySelectorAll("input");
	  for (let i = 0; i < inputs.length; i++) {
		  if (inputs[i].value.startsWith(run)) {
			  inputs[i].checked = ev.target.checked;
		  }
	  }
  }
</script>

<h1>Send Link</h1>
<p>
  Packs a run folder into a .tar.gz and then sends an email to the specified
  recepients providing a download links. Download links expire eventually.<br />

  Sending another link for the same folder will not pack it again, but duplicate
  the existing .tar.gz file. They both expire at their natural days.
</p>

<form method="POST">
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <label> Runs to include </label>
  {#if data.runs.length == 0}
    <p>No runs currently in working set.</p>
  {:else}
    {#each data.runs as run}
	<div  class="evenodd" style="border-bottom: 1px dashed grey;">
      <input
        type="checkbox"
        name="to_send"
        id="run_{escape_name(run.name)}"
		value="{run.name}___complete"
        bind:group={chosen_run}
		on:click={forward_complete_click}
      />
      <label for="run_{escape_name(run.name)}">{run.name} (complete)

	  </label>
	  <RunDisplay data={run} label="info" />
      <br />
	  {#each run.alignments as alignment}
	  <span 
		  style="padding-left:1em;"
		  />
	  <input
		type="checkbox"
		name="to_send"
		id="run_{escape_name(run.name)}___{alignment}"
		value="{run.name}___{alignment}"
		bind:group={chosen_run}
	  />
	  <label for="run_{escape_name(run.name)}___{alignment}"

	  >{run.name} ({alignment})
	  </label>
	  <br />
	  {/each}
	</div>
    {/each}
  {/if}
  <br />

  <label for="date"
    >Valid until
    <span class="normal"> (default: 90 days) </span>
  </label>

  <!-- add date input with date 90 days in the future -->
  <input
    type="date"
    name="date"
    id="date"
    value={form?.date ?? iso_date(plus_days(new Date(), 90))}
    min={iso_date(plus_days(new Date(), 1))}
    required
  />
  <br />
  <label for="comment"
    >Comments <span class="normal">(included in email)</span></label
  >
  <textarea name="comment" id="comment" value={form?.comment ?? ""} rows="3" />

  <label for="receivers"
    >Receivers
    <span class="normal">
      (one per line, leave empty for 'no email send')
    </span>
  </label>

  <textarea
    name="receivers"
    id="receivers"
    value={form?.receivers ?? ""}
    rows="3"
  />

  {#if data.runs.length >= 0}
    <input type="submit" value="Add send task" />
  {/if}
</form>

<h2>Last requested links</h2>
{#if data.last_requests.length == 0}
  None
{:else}
  <table>
    <tr>
      <th>Contents</th>
      <th>Date</th>
      <th>Expires after</th>
      <th>Status</th>
      <th>Receiver</th>
      <th>URL</th>
    </tr>
    {#each data.last_requests as task}
      <tr>
        <td>
		{#each task.to_send as run_alignment }
			{run_alignment.replace("___", " (")})<br />
		{/each}
		</td>
        <td><DatePeriod timestamp={task.timestamp} include_time="true" /></td>
        <td><DatePeriod timestamp={task.invalid_after} include_time="true" /></td>
        <td>{task.status}</td>
        <td
          >{task.receivers}
          {#if task.email_success === true}
            (Sent)
          {:else if task.email_success === false}
            {#if task["receivers"].length > 0}
              <span class="error"> (failed) </span>
            {/if}
          {/if}
        </td>
        <td>
          {#if task.filename == "(expired)"}
            (expired)
          {:else if task.filename}
            <a href="{base}/download/{task.filename}">Download</a>
          {:else}
            -
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
  /* alternate row colors */
  tr:nth-child(even) {
    background-color: #eee;
  }

  .error {
    color: red;
  }

  .normal {
    font-weight: normal;
  }

  input,
  textarea {
    margin-left: 1em;
  }

  input[type="submit"] {
    margin-left: 0;
  }
</style>
