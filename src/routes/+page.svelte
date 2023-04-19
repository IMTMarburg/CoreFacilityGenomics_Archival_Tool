<script lang="ts">
  import { base } from "$app/paths";
  export let data;
</script>

<p>Welcome '{data.user}'.</p>
<p>The system has three data storages:</p>
<ul>
  <li>The working directory (where the sequencer stores data)</li>
  <li>
    The archive (=MaSC, eventually), where data can be moved from / to the working directory.
  </li>
  <li>
    The download area (where links disappear after X days, but are otherwise
    unaffected by working directory changes)
  </li>
</ul>
<p>
  You can request the system to do something via actions.<br />

  You can also inspect the system, and view all events, which allows you to
  trace exactly what was done when (and whether it succeeded).

</p>
<p>
	The background process actually doing the actions starts up every 5 minutes (if it's not currently
	busy with an action.<br />
	Some actions (e.g. deletions) are delayed to start at the earliest 15 minutes after
	the request was made. This is so you can actually abort them.
</p>

<p>
	The system considers pending tasks when deciding what you can do, so you can't 
	request a restore for something schedulded to be deleted etc. 
</p> 
<p>
<b>
	The system is in test mode. 
	<br />
	All datasets are 'fake', Sourced from incoming/cfgat_test.
	<br />
	Emails are being sent.
	<br />
	Minimum time for deletions from working directory has been set to 0 days.
	(from RTAComplete.txt) date
	<br />
	Minimum time time for deletions from archive has been set to 1 days.
	<br />
	Runs are discovered by having a 'RTAComplete.txt' file in the run directory, which must contain an 
	american formated completion date.
	
</b>

</p>
<h2>Actions</h2>
<ul>
  <li><a href="{base}/send_link">Send download link</a></li>
  <li><a href="{base}/archive">Archive</a></li>
  <li><a href="{base}/unarchive">Restore from archive</a></li>
  <li><a href="{base}/delete">Delete from working</a></li>
  <li><a href="{base}/mail_template">Change mail template</a></li>
  <li><a href="{base}/remove_from_archive">Delete from archive</a></li>
</ul>
<h2>Inspection</h2>
<ul>
  <li><a href="{base}/runs">Run status</a></li>
  <li><a href="{base}/tasks">Task status</a></li>
  <li><a href="{base}/events">Event log</a></li>
</ul>
