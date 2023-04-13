import { toast } from "@zerodevx/svelte-toast";
import { fail } from "@sveltejs/kit";

import { add_task, load_tasks, load_workingdir_runs } from "$lib/util";

export async function load() {
  let last_requests = [];
  let tasks = await load_tasks();
  for (let ii = tasks.length - 1; ii >= 0; ii--) {
    if (last_requests.length >= 5) {
      break;
    }
    if (tasks[ii].type == "provide_download_link") {
      last_requests.push(tasks[ii]);
    }
  }

  return {
    runs: await load_workingdir_runs(),
    last_requests,
  };
}

export const actions = {
  default: async ({ cookies, request }) => {
    const data = await request.formData();
    try {
      let runs = await load_workingdir_runs();
      let found = false;
      for (let run of runs) {
        if (run.name == data.get("run")) {
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error("Run not found");
      }
      if (data.get("receivers").trim().length == 0) {
        throw new Error("Receivers was empty");
      }
      if (data.get("receivers").indexOf("@") == -1) {
        throw new Error("Receivers did not contain an @");
      }
      add_task("provide_download_link", {
        "run": data.get("run"),
        "receivers": data.get("receivers"),
      });
      toast.push("Added");
    } catch (error) {
      return fail(422, {
        run: data.get("run"),
        receivers: data.get("receivers"),
        error: error.message,
      });
    }
  },
};
