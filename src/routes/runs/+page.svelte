<script lang="ts">
  import { format_timestamp, load_events, format_date_and_period } from "$lib/util";
  export let data;
</script>

<h1>Runs</h1>
<table>
  <tr>
    <th>Run ID</th>
    <th>Finish date</th>
    <th>Download count</th>
    <th>Current download link?</th>
    <th>In working set?</th>
    <th>Archive date</th>
    <th>Archive size (GB)</th>
  </tr>
  {#each Object.values(data.runs) as run}
    <tr>
      <td>{run.name}</td>
      <td>{format_timestamp(run.run_finish_date)}</td>
      <td>{run.download_count}</td>
      <td>
        {#if run.download_available}
          <a href="../download/{run.download_name}">Download</a>
        {/if}
      </td>
      <td>{run.in_working_set}</td>
      <td>{run.archive_date ? format_date_and_period(run.archive_date) : "-"}</td>
      <td
        >{#if run.archive_size}
          {Math.round(run.archive_size / 1024 / 1024 / 1024, 2)}
        {/if}
      </td>
    </tr>
  {/each}
</table>

<style>
  th,
  td {
    vertical-align: top;
    padding: 0.5em;
  }
  /* alternate row colors */
  tr:nth-child(even) {
    background-color: #eee;
  }
</style>
