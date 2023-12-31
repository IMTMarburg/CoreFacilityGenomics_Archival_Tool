import { fail } from "@sveltejs/kit";

import {
  isodate_to_timestamp,
  check_emails,
  load_times,
  add_time_interval
} from "$lib/util";

import {
  add_task,
  load_tasks,
  load_events,
  load_runs,
  runs_in_working_set,
} from "$lib/data";

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
      for (let jj = last_requests.length - 1; jj >= 0; jj--) {
        if (last_requests[jj].filename == events[ii].filename) {
          last_requests[jj].filename = "(expired)";
        }
      }
    }
  }
  var run_list = await load_runs();

  var runs = await runs_in_working_set(run_list);
  runs.sort((a, b) => {
    a["name"].localeCompare(b["name"]);
  });

  let times = await load_times();

  let res = {
    runs: runs,
    last_requests,
	valid_until: add_time_interval(new Date(), 'download_retention', times),
	valid_until_interval: times['download_retention'],
  };
  return res;
}

export const actions = {
  default: async ({ cookies, request, locals }) => {
    const data = await request.formData();
    try {
   	  var run_list = await load_runs();
      var runs = await runs_in_working_set(run_list);
      if (data.get("to_send") == null) {
        throw new Error("No run selected");
      }
      let to_send = data.getAll("to_send");
      let formated_to_send = [];
      for (let run_alignment of to_send) {
        let [run, alignment] = run_alignment.split("___");
        let found = false;
        for (let qrun of runs) {
          if (qrun.name == run) {
            if (
              (alignment == "complete") ||
              (qrun.alignments.indexOf(alignment) != -1)
            ) {
              found = true;
              formated_to_send.push(run_alignment);
              break;
            }
          }
        }
        if (!found) {
          throw new Error("Run not found: " + run + " - " + alignment);
        }
      }
      var receivers; 
	  if (data.get('receivers') === '') {
		  receivers = [];
	  }
	  else {
		  receivers = check_emails(data.get("receivers"));
	  }

      let invalidation_date = isodate_to_timestamp(data.get("date"));
      let comment = data.get("comment") ?? "";

      add_task("provide_download_link", {
        "to_send": formated_to_send,
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
