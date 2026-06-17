<script lang="ts">
  import { base } from "$app/paths";
  import DatePeriod from "$lib/components/DatePeriod.svelte";
  import { iso_date, plus_days } from "$lib/util";
  export let data;
  export let form;
</script>

<h1>Send Novogene batch</h1>
<p>
  Streams just the <code>*.fq.gz</code> reads out of a finished Novogene batch's
  <code>&lt;batch&gt;*.tar</code> deliveries into a fresh .tar (folder structure
  preserved, nothing extracted to disk) and emails a download link.<br />
  Only batches whose download has finished (the <code>done</code> sentinel is
  present) are listed. Download links expire eventually.
</p>

<form method="POST">
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <label>Batch to send</label>
  {#if data.batches.length == 0}
    <p>No finished Novogene batches available.</p>
  {:else}
    {#each data.batches as batch}
      <div class="evenodd" style="border-bottom: 1px dashed grey;">
        <input
          type="radio"
          name="batch_no"
          id="batch_{batch.batch_no}"
          value={batch.batch_no}
          checked={form?.batch_no == batch.batch_no}
        />
        <label for="batch_{batch.batch_no}">
          {batch.batch_no}
          <span class="normal"
            >({batch.tars.length} tar{batch.tars.length == 1 ? "" : "s"})</span
          >
        </label>
      </div>
    {/each}
  {/if}
  <br />

  <label for="date"
    >Valid until
    <span class="normal">
      (default: {data.valid_until_interval["value"]}
      {data.valid_until_interval["unit"]})
    </span>
  </label>
  <input
    type="date"
    name="date"
    id="date"
    value={form?.date ?? iso_date(data.valid_until)}
    min={iso_date(plus_days(new Date(), 1))}
    required
  />
  <br />
  <label for="comment"
    >Comments <span class="normal">(included in email)</span></label
  >
  <textarea name="comment" id="comment" value={form?.comment ?? ""} rows="3" />

  <label for="receivers"
    >Receivers
    <span class="normal">
      (one per line, leave empty for 'no email send')
    </span>
  </label>
  <textarea
    name="receivers"
    id="receivers"
    value={form?.receivers ?? ""}
    rows="3"
  />

  {#if data.batches.length > 0}
    <input type="submit" value="Add send task" />
  {/if}
</form>

<h2>Last requested links</h2>
{#if data.last_requests.length == 0}
  None
{:else}
  <table>
    <tr>
      <th>Batch</th>
      <th>Date</th>
      <th>Expires after</th>
      <th>Status</th>
      <th>Receiver</th>
      <th>URL</th>
    </tr>
    {#each data.last_requests as task}
      <tr>
        <td>{task.batch_no}</td>
        <td><DatePeriod timestamp={task.timestamp} include_time="true" /></td>
        <td><DatePeriod timestamp={task.invalid_after} include_time="true" /></td>
        <td>{task.status}</td>
        <td
          >{task.receivers}
          {#if task.email_success === true}
            (Sent)
          {:else if task.email_success === false}
            {#if task["receivers"].length > 0}
              <span class="error"> (failed) </span>
            {/if}
          {/if}
        </td>
        <td>
          {#if task.filename == "(expired)"}
            (expired)
          {:else if task.filename}
            <a href="{base}/download/{task.filename}">Download</a>
          {:else}
            -
          {/if}
        </td>
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
  tr:nth-child(even) {
    background-color: #eee;
  }

  .error {
    color: red;
  }

  .normal {
    font-weight: normal;
  }

  input,
  textarea {
    margin-left: 1em;
  }

  input[type="submit"],
  input[type="radio"] {
    margin-left: 0;
  }
</style>
