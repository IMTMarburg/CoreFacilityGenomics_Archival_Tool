<script lang="ts">
  export let data;
  export let form;
  let template = (form ?? {})["template"] ?? data.template;

  function handle_key_down(ev) {
    if (form != null) {
      delete form.success;
      form = form;
    }
  }
</script>

<h1>Change mail template</h1>

<p>Available replacements:</p>
<ul>
  <li>%URL% - the link to the download</li>
</ul>

<form method="POST" action="?/change">
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <textarea
    bind:value={template}
    rows="20"
    cols="80"
    placeholder="Enter template here"
    required
    name="template"
    on:keydown={handle_key_down}
  />
  <input type="submit" value="Save" />
  {#if form?.success}
    <p class="success">{form.success}!</p>
  {/if}
</form>
