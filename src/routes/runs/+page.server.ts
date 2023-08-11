import { load_runs } from "$lib/data";

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
  
  return {
    runs: runs,
  };
}
