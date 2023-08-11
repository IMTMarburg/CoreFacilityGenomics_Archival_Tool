import process from 'process';
import { load_todos } from '$lib/data';

export async function load({cookies, locals, url}) {
	  return {
	  user: locals.user,
	  todos: await load_todos(cookies),

  };
}
