<script lang="ts">
export let data;

</script>
<h1>Sequencer archival tool</h1>
<h2>Actions</h2>
<ul>
  <li><a href="/send_link">Send download link</a></li>
  <li><a href="/restore">Unarchive</a></li>
  <li><a href="/delete">Delete from working</a></li>
</ul>
<h2>Inspection</h2>
<ul>
  <li><a href="/tasks">View task status</a></li>
  <li><a href="/runs">View Run status</a></li>
  <li><a href="/events">Event log</a></li>
  <li><a href="/accounting">Accounting</a></li>
</ul>

{JSON.stringify(data, null, 2)}




