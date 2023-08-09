import { fail } from "@sveltejs/kit";

import { load_runs } from "$lib/util";
import { load_unannoteted_and_unfinished_annotation_runs } from "$lib/data";

function any_finished(annotations) {
	//write to stdout
	console.log(annotations);
	for (var idx in annotations) {
		if (annotations[idx]["run_finished"]) {
			return true;
		}
	}
	return false;
}


export async function load() {
  let runs = await load_runs();
  runs = Object.entries(runs);
  let uu = await load_unannoteted_and_unfinished_annotation_runs(runs);
  let unannotated_runs = uu['unannotated_runs'];
  let unfinished = uu['unfinished_runs'];

  let prev_annotated = runs.filter((run) =>
    run[1]["in_working_set"] && !run[1]["in_archive"]
	&& (run[1]["annotations"].length > 0)
	&& (any_finished(run[1]['annotations']))
  );
  prev_annotated = Object.fromEntries(prev_annotated);

  return {
    unannotated_runs: unannotated_runs,
	unfinished_runs: unfinished,
    prev_annotated: prev_annotated,
  };
}

export const actions = {};
