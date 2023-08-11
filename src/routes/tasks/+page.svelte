<script lang="ts">
  export let data;
  import { contains_all_words } from "$lib/util";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import JSONViewer from "$lib/components/JSONViewer.svelte";
  import Toggler from "$lib/components/Toggler.svelte";
  import { paginate, LightPaginationNav } from "svelte-paginate";

  let currentPage = 1;
  let pageSize = 10;
  let text_filter = "";

  $: filtered = data.tasks.filter((task) => {
    if (text_filter != "") {
      return contains_all_words(JSON.stringify(task), text_filter);
    } else {
      return true;
    }
  });
  $: paginatedItems = paginate({ items: filtered, pageSize, currentPage });

  function describe_task(task) {
    switch (task["type"]) {
      case "archive_run":
        return `archive_run(${task.run}, delete=${task.delete_after_archive})`;
      default: {
        if (task["run"]) {
          return `${task["type"]} (${task.run})`;
        } else {
          return task["type"];
        }
      }
    }
  }
</script>

<h1>Tasks</h1>
Filter:<input type="text" bind:value={text_filter} />

<table>
  <tr
    ><th>Task</th>
    <th>Status</th>
    <th>Request time</th>
    <th>Finish time time</th>
  </tr>

  {#each paginatedItems as task}
    <tr>
		<td><Toggler text="{describe_task(task)}">
			<JSONViewer object={task} />
			</Toggler>

		</td>
      <td>{task.status}</td>
      <td><DatePeriod timestamp={task.timestamp} include_time="true" /></td>
      <td><DatePeriod timestamp={task.finish_time} include_time="true" /></td>
    </tr>
  {/each}
</table>
<br />
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
  /* alternate row colors */
  tr:nth-child(even) {
    background-color: #eee;
  }
</style>
