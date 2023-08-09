import { fail } from "@sveltejs/kit";

import {
  add_task,
  update_task,
} from "$lib/util";

import { load_deletable_runs, pending_deletions } from "$lib/data";

export async function load() {
  let open_deletions = await pending_deletions();
  return {
    runs: await load_deletable_runs(),
    open_deletions: open_deletions,
  };
}

export const actions = {
  abort: async ({ cookies, request }) => {
    const form_data = await request.formData();
    try {
      let data = await load();
      for (let open_deletion of data.open_deletions) {
        let unix_timestamp = new Date().getTime() / 1000;
        if (
          open_deletion["run"] == form_data.get("run") &&
          open_deletion.status == "open"
        ) {
          update_task(open_deletion, {
            status: "aborted",
            abort_time: unix_timestamp,
          });
          return;
        }
      }
      throw new Error("Could not find open deletion to abort");
    } catch (error) {
      return fail(422, {
        run: form_data.get("run"),
        error: error.message,
      });
    }
  },

  delete: async ({ cookies, request, locals }) => {
    const form_data = await request.formData();
    try {
      let data = await load();
      let found = false;
      let found_run = null;
      for (let run of data.runs) {
        if (run.name == form_data.get("run")) {
          found = true;
          found_run = run;
          break;
        }
      }
      if (!found) {
        throw new Error("Run not found (or not eligible for deletion)");
      }
      add_task("delete_run", {
        run: form_data.get("run"),
        run_finish_date: found_run["run_finish_date"],
        archive_date: found_run["archive_date"],
      }, locals.user);
    } catch (error) {
      return fail(422, {
        run: form_data.get("run"),
        error: error.message,
      });
    }
  },
};
