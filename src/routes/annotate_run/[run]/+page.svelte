<script lang="ts">
  import {
    event_details,
    hash_string,
    iso_date,
    plus_months,
    plus_years,
    date_min,
    add_time_interval,
  } from "$lib/util";
  import RunDisplay from "$lib/components/RunDisplay.svelte";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import * as EmailValidator from "email-validator";
  export let data;
  export let form;

  let do_archive = form
    ? form.do_archive
    : data.run["annotations"].length > 0
    ? data.run["annotations"][data.run["annotations"].length - 1]["do_archive"]
    : false;

  let send_download_link = form == null || form.send_download_link;
  let run_finished =
    (data.run["annotations"].length > 0 &&
      data.run["annotations"][data.run["annotations"].length - 1][
        "run_finished"
      ]) ||
    (form != null && form.run_finished);

  function escape_name(name: string) {
    //escape for use in html id
    //hash name
    return (
      name.replace(/[^a-zA-Z0-9]/g, "_") + hash_string(name).then().catch()
    );
  }

  var formated_receivers = "";
  if (form?.receivers) {
    formated_receivers = form.receivers;
  } else if (
    data.run.annotations.length > 0 &&
    data.run.annotations[data.run.annotations.length - 1]["receivers"]
  ) {
    formated_receivers =
      data.run.annotations[data.run.annotations.length - 1]["receivers"].join(
        "\n"
      );
  }
  formated_receivers = formated_receivers.replace(",", "\n");

  function get_deletion_date() {
    if (data.run["annotations"].length > 0) {
      let dt =
        data.run["annotations"][data.run["annotations"].length - 1][
          "deletion_date"
        ];
      if (dt != null) {
        return iso_date(new Date(dt * 1000));
      }
    }
    return iso_date(
      add_time_interval(new Date(), "earliest_deletion", data.times)
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
      bind:value={formated_receivers}
      rows="3"
      required
    />

    <label for="comment"
      >Public Comment <span class="normal">(included in email)</span></label
    >
    <textarea
      name="comment"
      id="comment"
      value={form?.comment ??
        (data.run.annotations.length > 0
          ? data.run.annotations[data.run.annotations.length - 1]["comment"]
          : "")}
      rows="3"
    />

    <label for="private_comment"
      >'Private' Notes <span class="normal">(not included in email)</span
      ></label
    >
    <textarea
      name="private_comment"
      id="private_comment"
      value={form?.private_comment ??
        (data.run.annotations.length > 0
          ? data.run.annotations[data.run.annotations.length - 1][
              "private_comment"
            ]
          : "")}
      rows="3"
    />

    {#if data.run.annotations.length > 0 && data.run.annotations[data.run.annotations.length - 1]["run_finished"] === true}
      <label>Run already marked finished (can't be undone)</label>
    {:else}
      <label for="run_finished" style="display:inline"
        >Mark run as finished (and send email)</label
      >

      <input
        type="checkbox"
        name="run_finished"
        id="run_finished"
        value="true"
        bind:checked={run_finished}
      />
      <br />
    {/if}

    {#if run_finished}
      <div>
        <label for="archive" style="display:inline"> Archive: </label><input
          type="checkbox"
          name="archive"
          id="archive"
          value="true"
          bind:checked={do_archive}
        />
      </div>
      {#if do_archive}
        <label for="deletion_date">Archive after date</label>
        <input
          type="date"
          name="deletion_date"
          id="date"
          value={form?.date ??  get_deletion_date()}
          min={date_min(
			  get_deletion_date(),
               iso_date(
                  add_time_interval(new Date(), "earliest_deletion", data.times)
                )
          )}
          required
        />
        <label for="archive_date">Archive until</label>
        <input
          type="date"
          name="archive_date"
          id="archive_date"
          value={form?.archive_date ??
            (data.run["annotations"].length > 0
              ? data.run["annotations"][data.run["annotations"].length - 1][
                  "archive_date"
                ]
              : null) ??
            iso_date(add_time_interval(new Date(), "archive", data.times))}
          min={date_min(
				iso_date(add_time_interval(new Date(), "archive", data.times)),
				data.run["annotations"].length > 0 ?
				data.run["annotations"][data.run["annotations"].length - 1][ "archive_date"]
				: null
          )}
          required
        />
      {:else}
        <label for="deletion_date">Deletion date</label>
        <input
          type="date"
          name="deletion_date"
          id="date"
          value={form?.date ?? get_deletion_date()}
          min={date_min(
            get_deletion_date(),
            iso_date(
              add_time_interval(new Date(), "earliest_deletion", data.times)
            )
          )}
          required
        />
        <br />
      {/if}

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
    {/if}

    {#if run_finished}
      <input type="submit" value="Submit & send mail" />
    {:else}
      <input type="submit" value="Submit" />
    {/if}
  </form>
{/if}

<style>
</style>
