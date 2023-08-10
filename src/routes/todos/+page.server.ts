

import {load_todos} from '$lib/data';

export async function load() {
  return {
    todos: (await load_todos()),
  };
}
