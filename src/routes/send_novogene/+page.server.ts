import { fail } from "@sveltejs/kit";

import {
  isodate_to_timestamp,
  check_emails,
  load_times,
  add_time_interval,
} from "$lib/util";

import {
  add_task,
  load_tasks,
  load_events,
  load_novogene_batches,
} from "$lib/data";

export async function load() {
  let batches = await load_novogene_batches();

  let last_requests = [];
  let tasks = await load_tasks();
  for (let ii = tasks.length - 1; ii >= 0; ii--) {
    if (last_requests.length >= 5) {
      break;
    }
    if (tasks[ii].type == "provide_novogene_download") {
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

  let times = await load_times();

  return {
    batches,
    last_requests,
    valid_until: add_time_interval(new Date(), "download_retention", times),
    valid_until_interval: times["download_retention"],
  };
}

export const actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    try {
      let batch_no = ((data.get("batch_no") as string) ?? "").trim();
      if (!batch_no) {
        throw new Error("No batch selected");
      }

      let batches = await load_novogene_batches();
      if (!batches.find((b) => b.batch_no == batch_no)) {
        throw new Error("Batch not found / not finished: " + batch_no);
      }

      let pending = (await load_tasks()).filter(
        (t) =>
          t["type"] == "provide_novogene_download" &&
          t["batch_no"] == batch_no &&
          (t["status"] == "open" || t["status"] == "processing"),
      );
      if (pending.length > 0) {
        throw new Error(`A send task for batch ${batch_no} is already pending.`);
      }

      var receivers;
      if (data.get("receivers") === "") {
        receivers = [];
      } else {
        receivers = check_emails(data.get("receivers"));
      }

      let invalidation_date = isodate_to_timestamp(data.get("date"));
      let comment = data.get("comment") ?? "";

      await add_task(
        "provide_novogene_download",
        {
          batch_no,
          receivers,
          invalid_after: invalidation_date + 24 * 3600,
          comment,
        },
        locals.user,
      );
    } catch (error) {
      return fail(422, {
        batch_no: data.get("batch_no"),
        receivers: data.get("receivers"),
        error: error.message,
      });
    }
  },
};
