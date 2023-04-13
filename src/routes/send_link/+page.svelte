<script lang="ts">
  import { format_timestamp, event_details, hash_string } from "$lib/util";
  import * as EmailValidator from "email-validator";
  import { toast } from "@zerodevx/svelte-toast";
  export let data;
  export let form

  function escape_name(name: string) {
    //escape for use in html id
    //hash name
    return (
      name.replace(/[^a-zA-Z0-9]/g, "_") + hash_string(name).then().catch()
    );
  }

</script>

<h1>Send Link</h1>

<form method="POST" >
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <label for="receivers">Receivers</label>
  (comma seperated)
  <input type="text" name="receivers" id="receivers" value={form?.receivers ??''}/>
  <br />
  Include:
  <ul>
    {#each data.runs as run}
      <li>
        <input
          type="radio"
          name="run"
          id="run_{escape_name(run.name)}"
          value={run.name}
          required
        />
        <label for="run_{escape_name(run.name)}">Run {run.name}</label>
      </li>
    {/each}
  </ul>
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
    </tr>
    {#each data.last_requests as task}
      <tr>
        <td>{task.run}</td>
        <td>{format_timestamp(task.timestamp)}</td>
        <td>{task.status}</td>
        <td>{task.receivers}</td>
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
