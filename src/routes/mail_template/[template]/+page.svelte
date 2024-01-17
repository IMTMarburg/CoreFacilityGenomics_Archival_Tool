<script lang="ts">
  import Handlebars from "handlebars";
  import { base } from "$app/paths";
  import { onMount } from "svelte";

  export let data;
  export let form;
  let template = (form ?? {})["template"] ?? data.template;
  let subject = (form ?? {})["subject"] ?? data.default_subject;
  let available = data.available;

  function handle_key_up(ev) {
    try {
      document.getElementById("save").disabled = true;
      document.getElementById("parse_error").innerHTML = "";
      document.getElementById("output").innerHTML = "";
      let unparsed = document.getElementById("example_data").value;
      let json = JSON.parse(unparsed);
      try {
        let raw_template = document.getElementById("template").value;
        let template = Handlebars.compile(raw_template, { strict: true });
        document.getElementById("output").innerHTML = template(json);
      } catch (e) {
        document.getElementById("parse_error").innerHTML =
          "Error parsing template: " + e;
        return;
      }
      document.getElementById("save").disabled = false;

      if (ev != null) {
        document.getElementById("parse_error").innerHTML = "";
      }
    } catch (e) {
      document.getElementById("parse_error").innerHTML =
        "Error parsing data: " + e;
      return;
    }
  }

  //when the document is loaded, svelte style
  onMount(async () => {
    handle_key_up(null);
  });
</script>

<h1>Change mail template: {data.template_name}</h1>

<p>
  The system uses <a href="https://handlebarsjs.com/guide/#what-is-handlebars"
    >handle bar syntax</a
  >
  to 'hydrate' the templates. <br />
  That means it replaces {"{variable}"} with supplied data, and {"{#if condition}"}...{"{/if}"}
  with the contents if the condition is true.
  <br />
  There is a preview below. You can only save when the preview is okay.
</p>

<p>
  Here is an example of what the template will fill in later. (You can change
  the values for testing).
  <a
    on:click={() => {
      document.getElementById("example_data").value = JSON.stringify(
        data.example_data,
        null,
        2
      );
      handle_key_up(null);
    }}
    class="small">Click to reset example</a
  >
  <textarea rows="10" cols="80" on:keyup={handle_key_up} id="example_data"
    >{JSON.stringify(data.example_data, null, 2)}</textarea
  >
</p>

<form method="POST" action="?/change">
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <p>
    The messages subject:

    <a
      on:click={() => {
        document.getElementById("subject").value = data.default_subject;
        handle_key_up(null);
      }}
      class="small">Click to reset subject to default</a
    >
  </p>
  <input
    type="text"
    id="subject"
    name="subject"
    bind:value={subject}
    required
  />

  <p>
    This is the template that you edit:

    <a
      on:click={() => {
        document.getElementById("template").value = data.default;
        handle_key_up(null);
      }}
      class="small">Click to reset template to default</a
    >
  </p>
  <textarea
    bind:value={template}
    rows="20"
    cols="80"
    placeholder="Enter template here"
    required
    name="template"
    id="template"
    on:keyup={handle_key_up}
  />

  <p>And this is what the email would look like</p>
  <p class="error" id="parse_error" />

  <pre id="output" style="">Text goes here</pre>

  <input type="submit" value="Save" id="save" />
  {#if form?.success}
    <p class="success" id="success">{form.success}!</p>
  {/if}
</form>

<style type="text/css">
  #output {
    background: #eee;
    border: 1px dashed black;
    padding-left: 1em;
    padding-top: 0.5em;
    padding-bottom: 0.5em;
  }
</style>
