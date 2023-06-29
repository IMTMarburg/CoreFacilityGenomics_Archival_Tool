<script lang="ts">
  import {
    event_details,
    hash_string,
    iso_date,
    plus_months,
    plus_years,
    date_min,
  } from "$lib/util";
  import RunDisplay from "$lib/components/RunDisplay.svelte";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import * as EmailValidator from "email-validator";
  export let data;
  export let form;

  let do_archive = form?.do_archive;
  let send_download_link = form == null || form.send_download_link;

  function escape_name(name: string) {
    //escape for use in html id
    //hash name
    return (
      name.replace(/[^a-zA-Z0-9]/g, "_") + hash_string(name).then().catch()
    );
  }
</script>

<h1>Annotate run - {data.run.name}</h1>

{#if form?.success}
  Your annotation was saved. <br />
  The background process will send emails accordingly.
  <br />
  <br />
  <a href="../annotate_run/">Back to annotation page</a>
{:else}
  {#if data.run.annotations.length > 0}
    <p>This is an update.</p>{/if}

  <form method="POST" action="?/annotate">
    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    <label for="receivers"
      >Receivers
      <span class="normal"> (one per line, minimum one required) </span>
    </label>
    <textarea
      name="receivers"
      id="receivers"
      value={form?.receivers ?? data.run["receivers"] ?? ""}
      rows="3"
      required
    />

    <!-- add date input with date 90 days in the future -->
    <label for="deletion_date">Deletion date</label>
    <input
      type="date"
      name="deletion_date"
      id="date"
      value={form?.date ??
        data.run["deletion_date"] ??
        iso_date(plus_months(new Date(), 3))}
      min={date_min(
        data.run["deletion_date"],
        iso_date(plus_months(new Date(), 3))
      )}
      required
    />
    <br />

    <div>
      <label for="archive" style="display:inline"> Archive: </label><input
        type="checkbox"
        name="archive"
        id="archive"
        value="true"
        bind:checked={do_archive}
      />
    </div>
    <br />
    {#if do_archive}
      <label for="archive_date">Archive until</label>
      <input
        type="date"
        name="archive_date"
        id="archive_date"
        value={form?.archive_date ??
          data.run["archive_date"] ??
          iso_date(plus_years(new Date(), 10))}
        min={date_min(
          data.run["archive_date"],
          iso_date(plus_years(new Date(), 10))
        )}
        required
      />
    {/if}

    <label for="comment"
      >Comments <span class="normal">(included in email)</span></label
    >
    <textarea
      name="comment"
      id="comment"
      value={form?.comment ?? data.run["comment"] ?? ""}
      rows="3"
    />

    <label for="send_download_link" style="display:inline"
      >Also send download link (in seperate email)</label
    >
    <input
      type="checkbox"
      name="send_download_link"
      id="send_download_link"
      value="true"
      bind:checked={send_download_link}
    />
    <br />

    <input type="submit" value="Submit" />
  </form>
{/if}

<style>
</style>
