<script lang="ts">
  import { format_timestamp, event_details } from "$lib/util";
  export let data;
  import { paginate, LightPaginationNav } from "svelte-paginate";

  let filter = "";
  let text_filter = "";
  let currentPage = 1;
  let pageSize = 10;
  $: filtered = data.events.filter(
    (event) =>
      (filter == "" || (event["type"] ?? "undefined").indexOf(filter) != -1) &&
      (text_filter == "" ||
        JSON.stringify(event)
          .toLowerCase()
          .indexOf(text_filter.toLowerCase()) != -1)
  );
  $: paginatedItems = paginate({ items: filtered, pageSize, currentPage });

  function page_forward() {
    currentPage = Math.min(currentPage + 1, totalPages);
    load_data();
  }
  function page_back() {
    currentPage = Math.max(currentPage - 1, 1);
    load_data();
  }

  async function loadData() {}
</script>

<h1>Events</h1>

Filter by event type:
<select bind:value={filter}>
  <option value="">All</option>
  {#each data.event_types as type}
    <option value={type}>{type}</option>
  {/each}
</select>
Text search
<input type="text" bind:value={text_filter} />

<table>
  <tr>
    <th>Event Time</th>
    <th>Event</th>
    <th>Details</th>
  </tr>
  {#each paginatedItems as event}
    <tr>
      <td>{format_timestamp(event.timestamp)}</td>
      <td>{event.type}</td>
      <td>{@html event_details(event)}</td>
    </tr>
  {/each}
</table>
<br />

<LightPaginationNav
  totalItems={data.events.length}
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
    text-align: left;
  }
  /* alternate row colors */
  tr:nth-child(even) {
    background-color: #eee;
  }

  :global(pre) {
    margin-top: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }

  input {
  width:40%;
  }

  :global(.right) 
  {
  text-align:right;
  }
</style>
