import { fail } from "@sveltejs/kit";
import process from "process";
import { load_template, save_template } from "$lib/data";
import toml from "toml";
import fs from "fs";

export async function load({ params }) {
  let toml_str = fs.readFileSync(process.env.TEMPLATES_PATH).toString();
  let templates = toml.parse(toml_str);
  let template_name = params.template;
  let default_template = templates[template_name]["default"];
  let default_subject = templates[template_name]["subject"];
  return {
    template_name: template_name,
    example_data: templates[template_name]["example_data"],
    template: await load_template(template_name, default_template),
    default: default_template,
    default_subject: default_subject,
  };
}

export const actions = {
  change: async ({ cookies, request, locals, params }) => {
    let template_name = params.template;
    const form_data = await request.formData();
    try {
      let template = form_data.get("template");
      let template_subject = form_data.get("subject");

      let changed = await save_template(
        template_name,
        template,
        template_subject,
        locals.user,
      );
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
