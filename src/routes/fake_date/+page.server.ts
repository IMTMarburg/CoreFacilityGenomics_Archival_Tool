import { fail } from "@sveltejs/kit";



export async function load({cookies}) {
  return {
	  fake_date: cookies.get("fake_date"),
  };
}

export const actions = {
  set_fake_date: async ({ cookies, request }) => {
    const form_data = await request.formData();
	if (form_data.get("submit") == "Set") {
		cookies.set("fake_date", form_data.get("fake_date"));
	} else {
		cookies.delete("fake_date");
	}
    try {
	  } catch (error) {
      return fail(422, {
        error: error.message,
      });
    }
  },
};
