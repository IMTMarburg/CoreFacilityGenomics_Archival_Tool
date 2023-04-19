import { load_runs } from "$lib/util";

interface Run {
  download_available?: boolean;
  download_name?: string;
  run_finish_date?: number;
  download_count: number;
  in_working_set: boolean;
  in_archive?: boolean;
}

type RunMap = {
  [name: string]: Run;
};

export async function load() {
  let runs = await load_runs();
  //runs is an object, not an array
  //so we need to sort the keys
  let run_names = Object.keys(runs);
  run_names.sort();
  run_names.reverse();
  let sorted_runs = {};
  for (let run_name of run_names) {
	  sorted_runs[run_name] = runs[run_name];
  }
  return {
    runs: sorted_runs,
  };
}
