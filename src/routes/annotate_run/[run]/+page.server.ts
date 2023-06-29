import { fail } from "@sveltejs/kit";

import { check_emails, load_runs, add_event } from "$lib/util";

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
  };
}

export const actions = {
  annotate: async ({ cookies, request, locals, params }) => {
    let data = await load({ params });
    console.log(data);
    const form_data = await request.formData();
    try {
      let receivers = check_emails(form_data.get("receivers"));
	  let out = {
			"receivers": receivers,
			"deletion_date": form_data.get("deletion_date"),
			"do_archive": form_data.get("archive", false),
			"comment": form_data.get("comment"),
			"send_download_link": form_data.get("send_download_link", false),

		}

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
        error: error.message,
      });

      //check that there is at least one receiver
      //and that every line has an email addres sand no spaces
    }
  },
};
