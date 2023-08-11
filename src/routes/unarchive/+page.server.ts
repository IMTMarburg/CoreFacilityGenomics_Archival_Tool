import { fail } from "@sveltejs/kit";

import { runs_to_names } from "$lib/util";
import {
  add_task,
  load_runs,
  load_tasks,
  pending_archive_deletions,
  pending_restores,
  runs_in_archive,
  runs_in_working_set,
} from "$lib/data";

export async function load() {
  let run_list = await load_runs();
  let tasks = await load_tasks();

  let open_tasks = pending_restores(tasks);
  let named_open_tasks = runs_to_names(open_tasks);

  let named_working_dir_runs = runs_to_names(
    runs_in_working_set(run_list),
  );
  let named_pending_deletions = runs_to_names(
    pending_archive_deletions(tasks),
  );

  let runs = runs_in_archive(run_list);
  //filter runs to only those that are not in the process of being deleted
  runs = runs.filter((run) => {
    return named_open_tasks[run.name] == undefined &&
      named_working_dir_runs[run.name] == undefined &&
      named_pending_deletions[run.name] == undefined;
  });

  return {
    runs: runs,
    open_tasks: open_tasks,
  };
}

export const actions = {
  archive: async ({ request, locals }) => {
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
