import { fail } from "@sveltejs/kit";

import { last_annotation } from "$lib/util";
import {
  load_runs,
  run_is_still_annotatable,
  runs_annotation_unfinished,
  runs_unannotated,
} from "$lib/data";

function any_finished(annotations) {
  //write to stdout
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

  let prev_annotated = run_list.filter((run) => {
    return run_is_still_annotatable(run) &&
      (run.annotations.length > 0);
  });
  console.log(prev_annotated.map((x) => (x['name'])));

  return {
    unannotated_runs: unannotated_runs,
    unfinished_runs: unfinished,
    prev_annotated: prev_annotated,
  };
}

export const actions = {};
