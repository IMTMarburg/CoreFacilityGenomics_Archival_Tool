import { fail } from "@sveltejs/kit";

import {
  add_time_interval,
  check_emails,
  isodate_to_timestamp,
  load_times,
} from "$lib/util";
import { add_event, add_task, load_runs } from "$lib/data";

export async function load({ params }) {
  let runs = await load_runs();
  let run = runs.filter((run) => {return run.name == params.run;})[0];
  if (run == undefined) {
    throw "Run not found";
  }
  if (run["in_archive"]) {
    throw "Run is in archive";
  }
  if (!run["in_working_set"]) {
    throw "Run is not in working set";
  }
  return {
    run: run,
    times: load_times(),
  };
}

export const actions = {
  annotate: async ({ request, locals, params }) => {
    let data = await load({ params });
    const form_data = await request.formData();
    try {
      let receivers = check_emails(form_data.get("receivers"));
      let is_updated = data.run["annotations"].length > 0 &&
        (data
          .run["annotations"][data.run["annotations"].length - 1][
            "run_finished"
          ] === true);
      let run_finished = is_updated ||
        (form_data.get("run_finished") == "true");
      let send_download_link = form_data.get("send_download_link", false);
      let out = {
        "run": data["run"]["name"],
        "receivers": receivers,
        "run_finished": run_finished,
        "is_update": is_updated,
        "deletion_date": isodate_to_timestamp(form_data.get("deletion_date")),
        "do_archive": form_data.get("archive", false) == "true",
        "archive_deletion_date": isodate_to_timestamp(
          form_data.get("archive_date", false),
        ),
        "comment": form_data.get("comment"),
        "private_comment": form_data.get("private_comment"),
        "send_download_link": send_download_link,
      };

      await add_event("run_annotated", out, locals.user);
	  if (run_finished) {
		  await add_task("send_annotation_email", out, locals.user);
	  }
      if (send_download_link) {
        let invalidation_date = add_time_interval(
          new Date(),
          "download_retention",
          load_times(),
        );
        await add_task("provide_download_link", {
          "to_send": [data["run"]["name"] + "___complete"],
          "receivers": receivers,
          "invalid_after": invalidation_date / 1000,
          "comment": "",
        }, locals.user);
      }

      return { success: true };
    } catch (error) {
      return fail(422, {
        run: data["run"],
        receivers: form_data?.get("receivers"),
        send_download_link: form_data?.get("send_download_link"),
        do_archive: form_data?.get("archive"),
        archive_date: form_data?.get("archive_date"),
        deletion_date: form_data?.get("deletion_date"),
        comment: form_data?.get("comment"),
        private_comment: form_data?.get("private_comment"),
        error: error.message,
      });

      //check that there is at least one receiver
      //and that every line has an email addres sand no spaces
    }
  },
};
