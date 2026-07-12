import { schedule } from "@netlify/functions";
import { sendClassReminders } from "../../src/lib/notifications";

// Netlify has no long-running process for the old node-cron scheduler, so
// this runs on Netlify's own cron infrastructure instead — same 5-minute
// cadence as the in-process job it replaces.
export const handler = schedule("*/5 * * * *", async () => {
  await sendClassReminders();
  return { statusCode: 200 };
});
