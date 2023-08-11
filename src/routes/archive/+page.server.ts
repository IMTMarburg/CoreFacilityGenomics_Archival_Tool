import { fail } from "@sveltejs/kit";

import {
  add_task,
  load_runs,
  load_tasks,
  pending_archivals,
  runs_can_be_archived,
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
      let tasks = await load_tasks();
      var run_list = await load_runs();
      var run = form_data.get("run");
      var found_runs = runs_can_be_archived(cookies, run_list, tasks)
        .filter((check_run) => {
          return (check_run.name == run);
        });
      var found_deleteable = found_runs.length > 0;

      if (!found_deleteable) {
        throw new Error("Run not eligible for deletion yet");
        //check whether the run is elibible for deletion
      }
	  var found_run = found_runs[0];
      let do_archive_and_delete = form_data.get("what") == "Archive and Delete";
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
