import process from 'process';
import { load_todos } from '$lib/data';

export async function load({request, locals}) {
  return {
	  user: locals.user,
	  todos: await load_todos(),

  };
}
