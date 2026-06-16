<script lang="ts">
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  export let data;
  export let form;
</script>

<h1>Download from Novogene</h1>

<p>
  Files will be placed in <code>$WORKING_DIR/Novogene/&lt;BATCH_NO&gt;/</code>.
</p>

<form method="POST" action="?/download">
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <table>
    <tr>
      <th><label for="batch_no">Batch number</label></th>
      <td><input id="batch_no" name="batch_no" type="text" value={form?.batch_no ?? ""} required /></td>
    </tr>
    <tr>
      <th><label for="password">Password</label></th>
      <td><input id="password" name="password" type="password" required /></td>
    </tr>
  </table>

  <br />
  <input type="submit" value="Queue download" />
</form>

<h2>Currently pending</h2>
{#if data.open_tasks.length == 0}
  None
{:else}
  <table>
    <tr>
      <th>Batch</th>
      <th>Status</th>
      <th>Requested</th>
    </tr>
    {#each data.open_tasks as task}
      <tr>
        <td>{task.batch_no}</td>
        <td>{task.status}</td>
        <td><DatePeriod timestamp={task.timestamp} include_time="true" /></td>
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

  .error {
    color: red;
  }
</style>
