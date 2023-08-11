import { fail } from "@sveltejs/kit";

import { runs_unannotated, runs_annotation_unfinished, load_runs  } from "$lib/data";

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
  let run_list = await load_runs();
  let unannotated_runs = runs_unannotated(run_list);
  let unfinished = runs_annotation_unfinished(run_list);

  let prev_annotated = run_list.filter((run) =>
    run["in_working_set"] && !run["in_archive"]
	&& (run["annotations"].length > 0)
	&& (any_finished(run['annotations']))
  );

  return {
    unannotated_runs: unannotated_runs,
	unfinished_runs: unfinished,
    prev_annotated: prev_annotated,
  };
}

export const actions = {};
