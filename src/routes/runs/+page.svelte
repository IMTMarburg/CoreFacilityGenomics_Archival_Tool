<script lang="ts">
  import { base } from "$app/paths";
  import {
    load_events,
  } from "$lib/util";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import RunDisplay from "$lib/components/RunDisplay.svelte";
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
    <th>Archive end date</th>
    <th>Archive size (GB)</th>
    <th>In archive</th>
  </tr>
  {#each Object.values(data.runs) as run}
    <tr>
      <td>
	  <RunDisplay data={run}/>

	  </td>
      <td>
		<DatePeriod timestamp={run.run_finish_date} />

	  </td>
      <td>{run.download_count}</td>
      <td>
        {#if run.download_available}
          <a href="{base}/download/{run.download_name}">Download</a>
        {/if}
      </td>
      <td>{#if run.in_working_set}yes{:else}no{/if}</td>
      <td>
		<DatePeriod timestamp={run.archive_date} />
  	  </td>
      <td
        >
		<DatePeriod timestamp={run.archive_end_date} />
      </td>
      <td
        >{#if run.archive_size}
          {Math.round(run.archive_size / 1024 / 1024 / 1024, 2)}
        {/if}
      </td>
	  <td>{#if run.in_archive}yes{:else}no{/if}</td>
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
