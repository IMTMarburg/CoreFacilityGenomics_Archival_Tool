import process from "process";
import { fail } from "@sveltejs/kit";
import fs from "fs";
import { add_event } from "$lib/util";

const default_template = "Your download is available at %URL%.\n\n\
It will be available until %DELETION_DATE% which is %DAYS% days from now.\n\
\n\
Further comments: %COMMENT%";

async function load_template() {
  return await fs.promises.readFile(
    process.env.DATA_DIR + "/template.txt",
    "utf8",
  );
}
async function save_template(text) {
  await fs.promises.writeFile(
    process.env.DATA_DIR + "/template.txt",
    text,
    "utf8",
  );
}
export async function load() {
  //read from file data_dir / template.txt
  let template;
  try {
    template = await load_template();
  } catch (e) {
    template = default_template;
  }
  return {
    template,
  };
}
export const actions = {
  change: async ({ cookies, request, locals }) => {
    const form_data = await request.formData();
    try {
      let template = form_data.get("template");
      if ((template ?? "").indexOf("%URL%") == -1) {
        throw new Error("Template must contain %URL%" + template);
      }
      let old_template = await load_template().catch(err => default_template);
      if (old_template != template) {
        await save_template(template);
        await add_event("template_changed", {
          "old_template": old_template,
        }, locals.user);

	  return {success: "Saved"};
      } else {

	  return {success: "Unchanged"};
	  }
    } catch (error) {
      return fail(422, {
        template: form_data.get("template"),
        error: error.message,
      });
    }
  },
};
