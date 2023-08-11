import { fail } from "@sveltejs/kit";

import {
  add_task,
  runs_can_be_archived,
  load_runs,
  load_tasks,
  pending_archivals,
} from "$lib/data";

export async function load({ cookies }) {
  let tasks = await load_tasks();
  var run_list = await load_runs();
  let open_tasks = pending_archivals(tasks);
  return {
    runs: runs_can_be_archived(cookies, run_list, tasks),
    open_tasks: open_tasks,
  };
}

export const actions = {
  archive: async ({ cookies, request, locals }) => {
    const form_data = await request.formData();
    try {
      let data = await load({ cookies });
      let found = false;
      let found_run = null;
      let found_deleteable = false;
      for (let run of data.runs) {
        if (run.name == form_data.get("run")) {
          found = true;
          found_run = run;
          found_deleteable = found_run.earliest_deletion_timestamp <
            ((new Date().getTime()) / 1000);
          break;
        }
      }
      if (!found) {
        throw new Error("Run not found (or not eligible for archiving )");
      }
      let do_archive_and_delete = form_data.get("what") == "Archive and Delete";
      if (do_archive_and_delete && !found_deleteable) {
        throw new Error("Run not eligible for deletion yet");
        //check whether the run is elibible for deletion
      }
      add_task("archive_run", {
        run: form_data.get("run"),
        run_finish_date: found_run["run_finish_date"],
        archive_date: found_run["archive_date"],
        delete_after_archive: do_archive_and_delete,
      }, locals.user);
    } catch (error) {
      return fail(422, {
        run: form_data.get("run"),
        error: error.message,
      });
    }
  },
};
