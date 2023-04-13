<script lang="ts">
import {format_timestamp} from '$lib/util';
export let data;

function describe_task(task) {
    switch (task['type']) {
		case 'provide_download_link':
			return `Provide download link (${task.run})`;
		default: 
			return task['type'];
	}
}

</script>
<h1>Tasks</h1>

<table>
<tr><th>Task</th>
<th>Status</th>
<th>Request time</th>
<th>Finish time time</th>
</tr>
{#each data.tasks.reverse() as task}
<tr>
<td>{describe_task(task)}</td>
<td>{task.status}</td>
<td>{format_timestamp(task.timestamp)}</td>
<td>{task.finish_time != undefined ? format_timestamp(task.finish_time) :'-'}</td>
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
