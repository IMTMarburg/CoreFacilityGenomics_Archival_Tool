import { fail } from "@sveltejs/kit";
import { add_event, load_template, save_template } from "$lib/util";

let templates = {
  "download_ready": {
    "default": `Your download for sequencing runs is available at {{URL}}.

The download file is supposed to be {{SIZE}} bytes in size.
Please check the included sha256 files with sha256sum to verify integrity.

The download will be available at least until {{DELETION_DATE}} which is {{DAYS}} days from now.

{{#if COMMENT}}
Further comments: %COMMENT%",
{{/if}}
`,
    "example_data": {
      "URL": "https://example.com/download/123",
      "SIZE": 123456789,
      "DELETION_DATE": "2023-06-27",
      "DAYS": 10,
      "COMMENT": "This is an example comment.",
    },
  },

  "run_completed": {
    "default": `Your sequencing run has been completed.
It is name {{RUN_NAME}}.
It will be stored at least until {{DELETION_DATE}} which is {{DAYS}} days from now.

{{#if DO_ARCHIVE}}
It will be archived until {{ARCHIVE_UNTIL}}.

{{/if}}
{{#if COMMENTS}}
Further comments: {{COMMENTS}}
{{/if}}
`,
    "example_data": {
      "RUN_NAME": "230623_NB552003_0218_AHJ3F3BGXT",
      "DELETION_DATE": "2023-06-27",
      "DAYS": 10,
      "DO_ARCHIVE": true,
      "ARCHIVE_UNTIL": "2033-07-07",
      "COMMENTS": "This is an example comment.",
    },
  },

  "run_about_to_be_deleted": {
    "default":
      `Your sequencing run {RUN_NAME} is about to be deleted from the server.

Deletion date: {{DELITION_DATE}} ({{DAYS}} days from now).

{{#if DO_ARCHIVE }}
It will then be archived until {{ARCHIVE_UNTIL}}.
{{else}}
It will not be archived! 
Contact us immediatly if you an extension!
{{/if}}
`,
    "example_data": {
      "RUN_NAME": "230623_NB552003_0218_AHJ3F3BGXT",
      "DELETION_DATE": "2023-06-27",
      "DAYS": 10,
      "DO_ARCHIVE": true,
      "ARCHIVE_UNTIL": "2033-07-07",
    },
  },
  "run_about_to_be_removed_from_archive": {
    "default":
      `Your sequencing run {RUN_NAME} is about to be deleted from archive.

	  It will be kept until {{ARCHIVE_UNTIL}}, which is {{DAYS}} days from now.

	  Please contact the core facilty if you need to download the data.
`,
    "example_data": {
      "RUN_NAME": "230623_NB552003_0218_AHJ3F3BGXT",
      "ARCHIVE_UNTIL": "2033-06-27",
      "DAYS": 30,
    },
  },
};

export async function load({ params }) {
  let template_name = params.template;
  let default_template = templates[template_name]["default"];
  return {
    template_name: template_name,
    example_data: templates[template_name]["example_data"],
    template: await load_template(template_name, default_template),
    default: default_template,
  };
}

export const actions = {
  change: async ({ cookies, request, locals, params }) => {
    let template_name = params.template;
    const form_data = await request.formData();
    try {
      let template = form_data.get("template");

      let changed = await save_template(template_name, template, locals.user);
      if (changed) {
        return { success: "Saved" };
      } else {
        return { success: "Unchanged" };
      }
    } catch (error) {
      return fail(422, {
        template: form_data.get("template"),
        error: error.message,
      });
    }
  },
};
