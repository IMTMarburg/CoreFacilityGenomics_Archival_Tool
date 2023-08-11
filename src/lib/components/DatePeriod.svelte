<script lang="ts">
  import { toIsoStringTZO, human_since, get_now } from "$lib/util";
    import { page } from '$app/stores'

  export let timestamp = null;
  export let include_time = false;
  export let newline = true;
  export let none_text = "-";


  $: days_since = Math.floor(
    (get_now($page.data.fake_date) * 1000 - new Date(timestamp * 1000).getTime()) / 86400000
  );
  $: local_date = toIsoStringTZO(new Date(timestamp * 1000), include_time);
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
