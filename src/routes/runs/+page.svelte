<script lang="ts">
  import { base } from "$app/paths";
  import { last_annotation } from "$lib/util";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import RunDisplay from "$lib/components/RunDisplay.svelte";
  export let data;

  </script>

<h1>Runs</h1>
<!--/* <th>Run ID</th>
    <th>Finish date</th>
    <th>Download count</th>
    <th>Current download link?</th>
    <th>In working set?</th>
    <th>Delete date</th>
    <th>Archive date</th>
    <th>Archive end date</th>
    <th>Archive size (GB)</th>
    <th>In archive</th> */
	-->
{#each Object.values(data.runs) as run}
  <table>
    <tr><td colspan="2"> <RunDisplay data={run} /></td></tr>
    <tr>
      <th>Finish date</th>
      <td> <DatePeriod timestamp={run.run_finish_date} /></td>
    </tr>
    <tr>
      <th>Download count</th>
      <td>{run.download_count}</td>
    </tr>

	{#if last_annotation(run, "receivers") }
	<tr>
		<th>Receiver</th>
		<td>{last_annotation(run, "receivers")}</td>
	</tr>
	{/if}
    <tr>
      <th>In working set</th>
      <td
        >{#if run.in_working_set}yes{:else}no{/if}</td
      >
    </tr>
    {#if last_annotation(run, "do_archive")}
      <tr>
        <th>Planned archive date</th>
        <td>
          <DatePeriod timestamp={last_annotation(run, "deletion_date")} />
        </td>
      </tr>
      <tr>
        <th>Actual archival date</th>
        <td>
          <DatePeriod timestamp={run.archive_date} />
        </td>
      </tr>
      <tr>
        <th>Planned archival remove date</th>
        <td>
          <DatePeriod
            timestamp={last_annotation(run, "archive_deletion_date")}
          />
        </td>
      </tr>
	  <tr>
        <th>Actual archival remove date</th>
        <td>
          <DatePeriod
            timestamp={run.archive_deletion_date}
          />
        </td>
      </tr>
	  {#if run.archive_date != null && run.archive_deletion_date == null}
		  <tr>
			<th>Size in archive (in GB)</th>
			<td
			  >{#if run.archive_size}
				{Math.round(run.archive_size / 1024. / 1024. / 1024. * 100) / 100}
			  {/if}
			</td>
		  </tr>
	  {/if}
    {:else}
      <tr>
        <th>Archive</th>
        <td>Not set for archivation</td>
      </tr>
      <tr>
        <th>Planned deletion date</th>
        <td><DatePeriod timestamp={last_annotation(run, "delete_date")} /></td>
      </tr>
      <tr>
        <th>Actual deletion date</th>
        <td> <DatePeriod timestamp={run.delete_date} /> </td>
      </tr>
    {/if}
	<tr>
		<th>Deletion/Archive warning mail sent</th>
		<td>{#if run.deletion_warning_sent}yes{:else}no{/if}</td>
	</tr>
<tr>
		<th>Archive removal warning mail sent</th>
		<td>{#if run.archive_deletion_warning_sent}yes{:else}no{/if}</td>
	</tr>

  </table>
  <br />
  <br />
{/each}

<style>
  th,
  td {
    vertical-align: top;
    padding: 0.5em;
  }

  th {
    text-align: left;
  }
  td {
    text-align: right;
  }
  /* alternate row colors */
  tr:nth-child(even) {
    background-color: #eee;
  }
</style>
