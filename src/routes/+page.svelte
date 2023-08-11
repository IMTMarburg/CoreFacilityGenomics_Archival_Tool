<script lang="ts">
  import Toggler from "$lib/components/Toggler.svelte";
  import { base } from "$app/paths";
  export let data;

  var todo_counts = {};
  var anything_todo = false;
  for (let k in data.todos) {
    let v = data.todos[k];
    let l = Object.keys(v).length;
    todo_counts[k] = l;
    if (l > 0) {
      anything_todo = true;
    }
  }
</script>

<p>Welcome '{data.user}'.</p>
<h2>Test mode</h2>
<p>
  <b>
    The system is in test mode.
    <br />
    All datasets are 'fake/copies', Sourced from incoming/cfgat_test.
    <br />
    Emails are being sent.
    <br />
  </b>
</p>

<Toggler text="Click here for system description" expanded="false">
<h2>Data storage</h2>
<p>The system has three data storages:</p>
<ul>
  <li>The working directory (where the sequencer stores data)</li>
  <li>
    The archive (=MaSC, eventually), where data can be moved from / to the
    working directory.
  </li>
  <li>
    The download area (where links disappear after X days, but are otherwise
    unaffected by working directory changes)
  </li>
</ul>
<h2>Actions</h2>
<p>
  You can request the system to do something via actions.<br />

  You can also inspect the system, and view all events, which allows you to
  trace exactly what was done when (and whether it succeeded).
</p>
<h2>Background process</h2>
<p>
  The background process actually doing the actions starts up every 5 minutes
  (if it's not currently busy with an action).<br />
  Some actions (e.g. deletions) are delayed to start at the earliest 15 minutes after
  the request was made. This is so you can actually abort them.
</p>

<h2>Workflow</h2> 
<ol>
	<li>Sequencer uploads data to working directory and marks the run finished.</li>
	<li>This system detects the run (and all alignments)</li>
	<li>You annotated the run with the receiver, mark it as finished, decide on archival (or not) and deletion dates.</li> 
	<li>The system mails the receivers that their run is finished, and the details you set on the annotation. <br />
	(If 'archive' was set, this includes the archive size)</li>
	<li>If requested, the system also generates & mails a download link</li>
	<li>If set to archive, the system also calculates the size the run will have once archived</li>
	<li>(You can push deletion/achive dates (and change 'archive-or-not' status into the future (before it actually happend).
		In that case, a new mail is sent to the receivers.)</li>
	<li>Before the runs get eligble for deletion/archival/archive-removal, the system sends out a warning mail.
		(This happens 
		{data.times.deletion_warning.value} 
		{data.times.deletion_warning.unit} 
		before deletion/archival, and 
		{data.times.archive_deletion_warning.value} 
		{data.times.archive_deletion_warning.unit} 
		before archive-removal).
	</li>
	<li>Once the email has been sent, the system will list the run in the todos.</li>	
	</ol>

<p>
  The system considers pending tasks when deciding what you can do, so you can't
  request a restore for something schedulded to be deleted etc.
</p>
</Toggler>
<hr />
<h2>Todos</h2>
{#if anything_todo}
  <ul>
    {#if todo_counts["no annotation"] > 0 || todo_counts["unfinished annotation"] > 0}
      <li>
        <a href="{base}/annotate_run"
          >Add annotation (missing: {todo_counts["no annotation"]}, unfinished: {todo_counts[
            "unfinished annotation"
          ]})</a
        >
      </li>
    {/if}
    {#if todo_counts["archive"] > 0}
      <li>
        <a href="{base}/archive">Archive runs ({todo_counts["archive"]})</a>
      </li>
    {/if}
    {#if todo_counts["delete"] > 0}
      <li>
        <a href="{base}/delete">Delete runs ({todo_counts["delete"]})</a>
      </li>
    {/if}
{#if todo_counts["delete_from_archive"] > 0}
      <li>
        <a href="{base}/delete_from_archive">delete_from_archive runs ({todo_counts["delete_from_archive"]})</a>
      </li>
    {/if}


  </ul>
{:else}
  Nothing needing your attention right now.
{/if}

<h2>Actions</h2>
<ul>
  <li><a href="{base}/annotate_run">Annotate run (=mark as ready)</a></li>
  <li><a href="{base}/send_link">Send download link</a></li>
  <li><a href="{base}/archive">Archive</a></li>
  <li><a href="{base}/unarchive">Restore from archive</a></li>
  <li><a href="{base}/delete">Delete from working</a></li>
  <li><a href="{base}/remove_from_archive">Delete from archive</a></li>
</ul>
<h2>Inspection</h2>
<ul>
  <li><a href="{base}/runs">Run status</a></li>
  <li><a href="{base}/tasks">Task status</a></li>
  <li><a href="{base}/events">Event log</a></li>
  <li><a href="{base}/log">Background process output</a></li>
</ul>
<h2>Maintenance</h2>
<ul>
  <li><a href="{base}/sort_by_date">Sort runs by date</a></li>
  <li><a href="{base}/mail_template">Change mail templates</a></li>
</ul>

