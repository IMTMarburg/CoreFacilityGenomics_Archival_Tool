

import {load_events} from '$lib/util';

export async function load() {
  return {
    events: (await load_events()).reverse(),
  };
}
