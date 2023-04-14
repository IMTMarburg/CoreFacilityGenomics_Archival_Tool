<script lang="ts">
  import { format_timestamp, event_details, hash_string } from "$lib/util";
  import * as EmailValidator from "email-validator";
  export let data;
  export let form

  let chosen_run = form?.run ?? "";

  function escape_name(name: string) {
    //escape for use in html id
    //hash name
    return (
      name.replace(/[^a-zA-Z0-9]/g, "_") + hash_string(name).then().catch()
    );
  }

</script>

<h1>Send Link</h1>
<p>Packs a run folder into a .tar.gz and then sends an email to the specified recepients providing 
a download links. Download links expire eventually.<br />

Sending another link for the same folder will not pack it again, but duplicate the existing .tar.gz 
file. They both expire at their natural days.
</p>



<form method="POST" >
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <label for="receivers">Receivers</label>
  (one per line, leave empty for 'no email send')
  <textarea name="receivers" id="receivers" value={form?.receivers ??''}></textarea>
  <br />
  Include:
  {#if data.runs.length == 0}
	  No runs currently in working set.
  {:else}
  <ul>
    {#each data.runs as run}
      <li>
        <input
          type="radio"
          name="run"
          id="run_{escape_name(run.name)}"
          value={run.name}
		  bind:group={chosen_run}
        />
        <label for="run_{escape_name(run.name)}">{run.name}</label>
      </li>
    {/each}
  </ul>
  {/if}
  <input type="submit" value="Add send task" />
</form>

<h2>Last requested links</h2>
{#if data.last_requests.length == 0}
  None
{:else}
  <table>
    <tr>
      <th>Run</th>
      <th>Date</th>
      <th>Status</th>
      <th>Receiver</th>
      <th>URL</th>
    </tr>
    {#each data.last_requests as task}
      <tr>
        <td>{task.run}</td>
        <td>{format_timestamp(task.timestamp)}</td>
        <td>{task.status}</td>
        <td>{task.receivers}
		{#if task.email_success === true}
		(Sent)
		{:else  if (task.email_success === false)}
		{#if task['receivers'].length > 0}
		<span class="error">
		(failed)
		</span>
		{/if}
		{/if}

		</td>
        <td>
		{#if task.filename}
		<a href="../download/{task.filename}">Download</a>
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
  color:red;
  }
</style>
