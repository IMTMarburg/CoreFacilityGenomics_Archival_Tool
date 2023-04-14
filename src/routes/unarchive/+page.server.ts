import { fail } from "@sveltejs/kit";

import {
  add_task,
  load_archived_runs,
  load_tasks,
  load_workingdir_runs,
  pending_restores,
  update_task,
} from "$lib/util";

export async function load() {
  let open_tasks = await pending_restores();
  let named_open_tasks = {};
  for (let deletion of open_tasks) {
    named_open_tasks[deletion["run"]] = true;
  }

  let working_dir_runs = await load_workingdir_runs();
  let named_working_dir_runs = {};
  for (let run of working_dir_runs) {
    named_working_dir_runs[run["name"]] = true;
  }

  let runs = await load_archived_runs();
  //filter runs to only those that are not in the process of being deleted
  runs = runs.filter((run) => {
    return named_open_tasks[run.name] == undefined &&
      named_working_dir_runs[run.name] == undefined;
  });

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
      for (let run of data.runs) {
        if (run.name == form_data.get("run")) {
          found = true;
          found_run = run;
          break;
        }
      }
      if (!found) {
        throw new Error("Run not found (or not eligible for restoration");
      }
      add_task("restore_run", {
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
