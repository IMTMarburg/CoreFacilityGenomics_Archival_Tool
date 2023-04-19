<script lang="ts">
import { iso_date, human_since } from "$lib/util";

export let timestamp = null;
export let newline = true;
export let none_text = "-";

$: days_since = Math.floor((Date.now() - (new Date(timestamp * 1000).getTime())) / 86400000);

</script>
{#if timestamp}
<span>
{iso_date(new Date(timestamp * 1000))}
</span>
{#if newline}
<div>{human_since(days_since)} </div>
{:else}
<span>({human_since(days_since)})</span>
{/if}

{:else}
{none_text}
{/if}


<style>
</style>
