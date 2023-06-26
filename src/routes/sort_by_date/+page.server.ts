import { fail } from "@sveltejs/kit";

import {
  add_task,
  load_archived_runs,
  load_tasks,
  load_workingdir_runs,
  pending_sorts,
  update_task,
} from "$lib/util";

export async function load() {
  let open_tasks = await pending_sorts();
  return {
    open_tasks: open_tasks,
  };
}

export const actions = {
  archive: async ({ cookies, request, locals }) => {
    const form_data = await request.formData();
    try {
      let data = await load();
      if (data.open_tasks.length > 0) {
        throw (new Error(
          "There is already a sort in progress. Please wait for it to finish before starting another.",
        ));
      }

      add_task("sort_by_date", {}, locals.user);
    } catch (error) {
      return fail(422, {
        run: form_data.get("run"),
        error: error.message,
      });
    }
  },
};
