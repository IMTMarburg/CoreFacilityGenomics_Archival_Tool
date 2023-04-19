<script lang="ts">
  import { iso_date, human_since } from "$lib/util";

  export let timestamp = null;
  export let include_time = false;
  export let newline = true;
  export let none_text = "-";

  function toIsoString(date) {
    var tzo = -date.getTimezoneOffset(),
      dif = tzo >= 0 ? "+" : "-",
      pad = function (num) {
        return (num < 10 ? "0" : "") + num;
      };

    if (include_time) {
      return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate())
		+ " " + 
		pad(date.getHours()) +
		":" +
		pad(date.getMinutes()) +
		":" +
		pad(date.getSeconds())
      );
    } else {
    }

    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate())
    );
  }

  $: days_since = Math.floor(
    (Date.now() - new Date(timestamp * 1000).getTime()) / 86400000
  );
  $: local_date = toIsoString(new Date(timestamp * 1000));
</script>

{#if timestamp}
  <span>
    <!--{iso_date(new Date(timestamp * 1000))} -->
    {local_date}
  </span>
  {#if newline}
    <div>{human_since(days_since)}</div>
  {:else}
    <span>({human_since(days_since)})</span>
  {/if}
{:else}
  {none_text}
{/if}

<style>
</style>
