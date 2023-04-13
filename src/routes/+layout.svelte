<script lang="ts">
import { SvelteToast, toast } from "@zerodevx/svelte-toast";

let toast_options = {
    // toast options
    pausable: true,
    duration: 10000,
  };

</script>
<SvelteToast options={toast_options} />
<slot />
