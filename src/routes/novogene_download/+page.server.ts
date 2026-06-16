import { fail } from "@sveltejs/kit";
import { add_task, load_tasks } from "$lib/data";

export async function load() {
  let tasks = await load_tasks();
  let open_tasks = tasks.filter(
    (t) =>
      t["type"] == "novogene_download" &&
      (t["status"] == "open" || t["status"] == "processing"),
  );
  return { open_tasks };
}

export const actions = {
  download: async ({ request, locals }) => {
    const form_data = await request.formData();
    const batch_no = (form_data.get("batch_no") as string ?? "").trim();
    const password = form_data.get("password") as string ?? "";

    try {
      if (!batch_no) throw new Error("Batch number is required.");
      if (!password) throw new Error("Password is required.");

      let tasks = await load_tasks();

      let pending = tasks.filter(
        (t) =>
          t["type"] == "novogene_download" &&
          t["batch_no"] == batch_no &&
          (t["status"] == "open" || t["status"] == "processing"),
      );
      if (pending.length > 0) {
        throw new Error(`A download for batch ${batch_no} is already pending.`);
      }

      let done = tasks.filter(
        (t) =>
          t["type"] == "novogene_download" &&
          t["batch_no"] == batch_no &&
          t["status"] == "done",
      );
      if (done.length > 0) {
        throw new Error(
          `Batch ${batch_no} was already downloaded successfully. Delete the task first if you need to re-download.`,
        );
      }

      await add_task("novogene_download", { batch_no, password }, locals.user);
    } catch (error) {
      return fail(422, { batch_no, error: error.message });
    }
  },
};
