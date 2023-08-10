<script lang="ts">
  export let data;
  import DatePeriod from "$lib/components/DatePeriod.svelte";

  function describe_task(task) {
    switch (task["type"]) {
      case "archive_run":
	   return `Archive_run(${task.run}, delete=${task.delete_after_archive})`;
      default: {
        if (task["run"]) {
          return `${task["type"]} (${task.run})`;
        } else {
          return task["type"];
        }
      }
    }
  }
</script>

<h1>Tasks</h1>

<table>
  <tr
    ><th>Task</th>
    <th>Status</th>
    <th>Request time</th>
    <th>Finish time time</th>
  </tr>
  {#each data.tasks as task}
    <tr>
      <td>{describe_task(task)}</td>
      <td>{task.status}</td>
      <td><DatePeriod timestamp={task.timestamp} include_time="true" /></td>
      <td><DatePeriod timestamp={task.finish_time} include_time="true" /></td>
    </tr>
  {/each}
</table>

<style>
  th,
  td {
    vertical-align: top;
    padding: 0.5em;
  }
  /* alternate row colors */
  tr:nth-child(even) {
    background-color: #eee;
  }
</style>
