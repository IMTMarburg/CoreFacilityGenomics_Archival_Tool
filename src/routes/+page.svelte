<script lang="ts">
  import { base } from "$app/paths";
  export let data;
</script>

<p>Welcome {data.user}</p>
<p>The system has three data storages:</p>
<ul>
  <li>The working directory (where the sequencer stores data)</li>
  <li>
    The archive (=MaSC), where data can be moved from / to the working directory
  </li>
  <li>
    The download area (where links disappear after X days, but are otherwise
    unaffected by working directory changes)
  </li>
</ul>
<p>
  You can request the system to do something via actions. You can also inspect
  the system's status, which allows you to trace exactly what was done when (and
  whether it succeeded).
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
