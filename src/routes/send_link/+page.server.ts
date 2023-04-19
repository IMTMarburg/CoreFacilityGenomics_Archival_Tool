import { fail } from "@sveltejs/kit";
import * as EmailValidator from "email-validator";

import {
  add_task,
  isodate_to_timestamp,
  load_tasks,
  load_workingdir_runs,
  load_events,
} from "$lib/util";

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
  let events = await load_events();
  for (let ii = events.length - 1; ii >= 0; ii--) {
    if (events[ii].type == "run_download_removed") {
      console.log("bingo");
      for (let jj = last_requests.length - 1; jj >= 0; jj--) {
        if (last_requests[jj].filename == events[ii].filename) {
          last_requests[jj].filename = '(expired)';
        }
      }
    }
  }
  let runs = await load_workingdir_runs();
  runs.sort((a, b) => {
    a["name"].localeCompare(b["name"]);
  });

  return {
    runs,
    last_requests,
  };
}

export const actions = {
  default: async ({ cookies, request, locals }) => {
    const data = await request.formData();
    try {
      let runs = await load_workingdir_runs();
      if (data.get("run") == null) {
        throw new Error("No run selected");
      }
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
      if (
        (data.get("receivers").trim().length > 0) &&
        data.get("receivers").indexOf("@") == -1
      ) {
        throw new Error("Receivers did not contain an @");
      }
      let individuals = data.get("receivers").split("\n");
      let receivers = [];
      for (let individual of individuals) {
        individual = individual.trim();
        if (individual.length != 0) {
          if (!EmailValidator.validate(individual)) {
            throw new Error("Invalid email address: '" + individual + "'");
          }
          receivers.push(individual);
        }
      }

      let invalidation_date = isodate_to_timestamp(data.get("date"));
	  let comment = data.get("comment") ?? "";

      add_task("provide_download_link", {
        "run": data.get("run"),
        "receivers": receivers,
        "invalid_after": invalidation_date + 24 * 3600,
		"comment": comment,
      }, locals.user);
    } catch (error) {
      return fail(422, {
        run: data.get("run"),
        receivers: data.get("receivers"),
        error: error.message,
      });
    }
  },
};
