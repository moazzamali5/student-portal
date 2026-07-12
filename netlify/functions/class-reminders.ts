import { schedule } from "@netlify/functions";
import { sendClassReminders, sendTaskReminders } from "../../src/lib/notifications";

// Netlify has no long-running process for the old node-cron scheduler, so
// this runs on Netlify's own cron infrastructure instead — same 5-minute
// cadence as the in-process job it replaces. Planner task reminders run on
// the same tick rather than as a separate scheduled function, since they
// share the exact same 5-minute cadence.
export const handler = schedule("*/5 * * * *", async () => {
  await sendClassReminders();
  await sendTaskReminders();
  return { statusCode: 200 };
});
