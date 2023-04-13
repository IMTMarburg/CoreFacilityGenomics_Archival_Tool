

import {load_tasks} from '$lib/util';

export async function load() {
  return {
    tasks: await load_tasks(),
  };
}
