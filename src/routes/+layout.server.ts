export async function load({ cookies }) {
  return {
    fake_date: cookies.get("fake_date"),
  };
}
