import { schedule } from "@netlify/functions";
import { sendWeeklyDigest } from "../../src/lib/notifications";

// Monday 06:00 UTC — adjust if the school's timezone differs meaningfully
// from UTC, since Netlify's scheduled functions run in UTC.
export const handler = schedule("0 6 * * 1", async () => {
  await sendWeeklyDigest();
  return { statusCode: 200 };
});
