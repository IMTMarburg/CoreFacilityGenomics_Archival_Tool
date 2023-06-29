import { fail } from "@sveltejs/kit";

import { load_runs } from "$lib/util";

export async function load() {
	let runs = await load_runs();
	runs = Object.entries(runs);
  let unannotated_runs = runs.filter((run) => run[1]['annotations'].length == 0);
  unannotated_runs = Object.fromEntries(unannotated_runs);

  let annotatable_runs = runs.filter((run) => run[1]['in_working_set'] && !run[1]['in_archive']);
  annotatable_runs = Object.fromEntries(annotatable_runs);

  return {
    unannotated_runs: unannotated_runs,
	annotatable_runs: annotatable_runs,
  };
}

export const actions = {};
