import { fail } from "@sveltejs/kit";

import {
  add_task,
  load_archived_runs,
  load_tasks,
  load_workingdir_runs,
  pending_archivals,
  update_task,
} from "$lib/util";

export async function load() {
  let open_tasks = await pending_archivals();
  let named_open_tasks = {};
  for (let deletion of open_tasks) {
    named_open_tasks[deletion["run"]] = true;
  }

  let archived = await load_archived_runs();
  let named_archived = {};
  for (let run of archived) {
    named_archived[run["name"]] = true;
  }

  let runs = await load_workingdir_runs();
  //filter runs to only those that are not in the process of being deleted
  runs = runs.filter((run) => {
    return named_open_tasks[run.name] == undefined &&
      named_archived[run.name] == undefined;
  });
  runs = runs.map((run, idx) => {
	  run.deleteable = run.earliest_deletion_timestamp < ((new Date().getTime()) / 1000);
	  return run});
	console.log(runs);


  return {
    runs: runs,
    open_tasks: open_tasks,
  };
}

export const actions = {
  archive: async ({ cookies, request, locals }) => {
    const form_data = await request.formData();
    try {
      let data = await load();
      let found = false;
      let found_run = null;
      let found_deleteable = false;
      for (let run of data.runs) {
        if (run.name == form_data.get("run")) {
          found = true;
          found_run = run;
          found_deleteable =
            found_run.earliest_deletion_timestamp <
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
