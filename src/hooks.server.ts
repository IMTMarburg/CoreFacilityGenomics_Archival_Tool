import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  //const url = new URL(event.request.url);

  const user = event.request.headers.get("REMOTE_USER") ??
    process.env.REMOTE_USER;
  if (user == undefined) {
    throw new Error("no auth");
  }
  event.locals.user = user;

  return resolve(event);
};
