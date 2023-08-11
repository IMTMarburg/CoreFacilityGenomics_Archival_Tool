import process from "process";
import { load_todos } from "$lib/data";
import { load_times } from "$lib/util";

export async function load({ cookies, locals, url }) {
  return {
    user: locals.user,
    todos: await load_todos(cookies),
    times: load_times(),
  };
}
