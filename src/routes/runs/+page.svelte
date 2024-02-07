<script lang="ts">
  import { base } from "$app/paths";
  import { last_annotation,contains_all_words } from "$lib/util";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import RunDisplay from "$lib/components/RunDisplay.svelte";
  import { paginate, LightPaginationNav } from "svelte-paginate";
  export let data;

  let currentPage = 1;
  let pageSize = 10;
  let text_filter = "";

  $: filtered = data.runs.filter((run) => {
    if (text_filter != "") {
      return contains_all_words(JSON.stringify(run), text_filter);
    } else {
      return true;
    }
  });
  $: paginatedItems = paginate({ items: filtered, pageSize, currentPage });
</script>

<h1>Runs</h1>
Filter:<input type="text" bind:value={text_filter} />
  {#each paginatedItems as run}
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

    {#if last_annotation(run, "receivers")}
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
          <DatePeriod timestamp={run.archive_deletion_date} />
        </td>
      </tr>
      {#if run.estimated_archive_size != null}
        <tr>
          <th>Future Size in archive (in GB)</th>
          <td
            >{Math.round(
              (run.estimated_archive_size / 1024 / 1024 / 1024) * 100
            ) / 100}</td
          >
        </tr>
      {/if}
      {#if run.archive_date != null && run.archive_deletion_date == null}
        <tr>
          <th>Current Size in archive (in GB)</th>
          <td
            >{#if run.archive_size}
              {Math.round((run.archive_size / 1024 / 1024 / 1024) * 100) / 100}
            {/if}
          </td>
        </tr>
      {/if}
      <tr>
        <th>Archive removal warning mail sent</th>
        <td
          >{#if run.archive_deletion_warning_sent}yes{:else}no{/if}</td
        >
      </tr>
    {:else}
      <tr>
        <th>Archive</th>
        <td>Not set for archivation</td>
      </tr>
      <tr>
        <th>Planned deletion date</th>
        <td><DatePeriod timestamp={last_annotation(run, "deletion_date")} /></td>
      </tr>
      <tr>
        <th>Actual deletion date</th>
        <td> <DatePeriod timestamp={run.delete_date} /> </td>
      </tr>
    {/if}
    <tr>
      <th>Deletion/Archive warning mail sent</th>
      <td
        >{#if run.deletion_warning_sent}yes{:else}no{/if}</td
      >
    </tr>
  </table>
  <br />
  <br />
{/each}
<LightPaginationNav
  totalItems={filtered.length}
  {pageSize}
  {currentPage}
  limit={1}
  showStepOptions={true}
  on:setPage={(e) => (currentPage = e.detail.page)}
/>



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
