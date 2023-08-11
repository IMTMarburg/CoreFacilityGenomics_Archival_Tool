<script lang="ts">
  import { base } from "$app/paths";
  export let data;
</script>

<h1>Pick a mail template to change</h1>

<ul>
	<li><a href="{base}/mail_template/run_completed">Run annotation finished</a></li>
	<li><a href="{base}/mail_template/download_ready">Download ready</a></li>
	<li><a href="{base}/mail_template/run_about_to_be_deleted">Run about to be deleted</a></li>
	<li><a href="{base}/mail_template/run_about_to_be_removed_from_archive">Run about to be removed from archive</a></li>
</ul>
