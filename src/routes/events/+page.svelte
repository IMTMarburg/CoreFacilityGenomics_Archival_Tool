<script lang="ts">
  import { event_details } from "$lib/util";
  export let data;
  import { paginate, LightPaginationNav } from "svelte-paginate";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import JSONViewer from "$lib/components/JSONViewer.svelte";

  let filter_event_type = "";
  let filter_source = "";
  let text_filter = "";
  let currentPage = 1;
  let pageSize = 10;
  $: filtered = data.events.filter(
    (event) =>
      (filter_event_type == "" ||
        (event["type"] ?? "undefined").indexOf(filter_event_type) != -1) &&
      (filter_source == "" ||
        (event["source"] ?? "undefined").indexOf(filter_source) != -1) &&
      (text_filter == "" ||
        contains_all_words(JSON.stringify(event), text_filter))
  );
  $: paginatedItems = paginate({ items: filtered, pageSize, currentPage });

  function contains_all_words(haystack: string, needle: string) {
    let haystack2 = haystack.toLowerCase();
    let needle2 = needle.toLowerCase();
    let words = needle2.split(" ");
    for (let word of words) {
      if (haystack2.indexOf(word) == -1) {
        return false;
      }
    }
    return true;
  }

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
<select bind:value={filter_event_type}>
  <option value="">All</option>
  {#each data.event_types as type}
    <option value={type}>{type}</option>
  {/each}
</select>
Filter by source:
<select bind:value={filter_source}>
  <option value="">All</option>
  {#each data.event_sources as v}
    <option value={v}>{v}</option>
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
      <td><DatePeriod timestamp={event.timestamp} include_time="true" /></td>
      <td>{event.type}</td>
      <td><JSONViewer object={event_details(event)} /> </td>
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
    width: 40%;
  }

  :global(.right) {
    text-align: right;
  }
</style>
