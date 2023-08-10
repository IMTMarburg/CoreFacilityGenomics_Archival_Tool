import { fail } from "@sveltejs/kit";
import { add_event, load_template, save_template } from "$lib/util";
import toml from "toml";
import fs from "fs";

export async function load({ params }) {
  let toml_str = fs.readFileSync("./static/mail_templates.toml").toString();
  let templates = toml.parse(toml_str);
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
