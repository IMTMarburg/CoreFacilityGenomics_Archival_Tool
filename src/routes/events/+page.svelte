<script lang="ts">
import {format_timestamp, event_details} from '$lib/util';
export let data;

</script>
<h1>Events</h1>

<table>
<tr><th>Event</th>
<th>Event Time</th>
<th>Details</th>
</tr>
{#each data.events as event}
<tr>
<td>{event.type}</td>
<td>{format_timestamp(event.timestamp)}</td>
<td>{@html event_details(event)}</td>
</tr>
{/each}
</table>


<style>
th, td {
vertical-align: top;
padding: 0.5em;
}
/* alternate row colors */
tr:nth-child(even) {
background-color: #eee;
}
</style>
