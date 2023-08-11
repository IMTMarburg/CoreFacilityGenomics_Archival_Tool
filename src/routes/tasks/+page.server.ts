

import {load_tasks} from '$lib/data';

export async function load() {
  return {
    tasks: (await load_tasks()).reverse(),
  };
}
