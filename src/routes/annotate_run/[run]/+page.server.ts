import { fail } from "@sveltejs/kit";

import { add_event, check_emails, load_runs, load_times } from "$lib/util";

export async function load({ params }) {
  let runs = await load_runs();
  let run = runs[params.run];
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
  annotate: async ({ cookies, request, locals, params }) => {
    let data = await load({ params });
    console.log(data);
    const form_data = await request.formData();
    try {
      let receivers = check_emails(form_data.get("receivers"));
      let run_finished = (data.run["annotations"].length > 0 &&
        (data
          .run["annotations"][data.run["annotations"].length - 1][
            "run_finished"
          ] === true)) ||
        (form_data.get("run_finished") == "true");
      let out = {
        "receivers": receivers,
        "run_finished": run_finished,
        "deletion_date": form_data.get("deletion_date"),
        "do_archive": form_data.get("archive", false),
        "comment": form_data.get("comment"),
        "private_comment": form_data.get("private_comment"),
        "send_download_link": form_data.get("send_download_link", false),
      };

      await add_event("run_annotated", {
        "run": data["run"]["name"],
        "annotation": out,
      }, locals.user);

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
