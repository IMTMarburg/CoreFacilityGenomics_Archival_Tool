import { fail } from "@sveltejs/kit";

import { get_now, last_annotation } from "$lib/util";
import {
  add_task,
  load_tasks,
  runs_can_be_deleted_from_archive,
  load_runs,
  pending_archive_deletions,
  update_task,
} from "$lib/data";

export async function load({ cookies }) {
  var run_list = await load_runs();
  let tasks = await load_tasks();
  var runs = runs_can_be_deleted_from_archive(cookies, run_list, tasks);

  let open_tasks = pending_archive_deletions(tasks);
  return {
    runs: runs,
    open_tasks: open_tasks,
  };
}

export const actions = {
  abort: async ({ cookies, request }) => {
    const form_data = await request.formData();
    try {
      let data = await load({ cookies: cookies });
      for (let open_deletion of data.open_tasks) {
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

  archive: async ({ cookies, request, locals }) => {
    const form_data = await request.formData();
    try {
      let data = await load({ cookies: cookies });
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
        throw new Error("Run not found");
      }
      found_run["archive_deletion_date"] = last_annotation(
        found_run,
        "archive_deletion_date",
      );
      if (
        !(found_run["archive_deletion_date"] &&
          found_run["archive_deletion_date"] < get_now(cookies))
      ) {
        throw new Error(
          "Run archive_deletion_date not in future" +
            JSON.stringify(found_run["archive_deletion_date"]),
        );
      }

      add_task("remove_from_archive", {
        run: form_data.get("run"),
        run_finish_date: found_run["run_finish_date"],
        archive_date: found_run["archive_date"],
        archive_deletion_date: found_run["archive_deletion_date"],
      }, locals.user);
    } catch (error) {
      return fail(422, {
        run: form_data.get("run"),
        error: error.message,
      });
    }
  },
};
