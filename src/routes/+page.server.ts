import process from 'process';
export async function load({request, locals}) {
  return {
	  user: locals.user

  };
}
