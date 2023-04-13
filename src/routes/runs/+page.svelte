<script lang="ts">
import {format_timestamp, load_events} from '$lib/util';
export let data;

</script>
<h1>Events</h1>


<pre>
{JSON.stringify(data.runs, null, 2)}
</pre>
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
