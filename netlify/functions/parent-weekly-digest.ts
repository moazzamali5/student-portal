import { schedule } from "@netlify/functions";
import { sendParentWeeklyDigest } from "../../src/lib/notifications";

// Sunday, separate from the Monday student digest since the audience and
// cadence both differ (parents want it before the week starts on Monday).
export const handler = schedule("0 8 * * 0", async () => {
  await sendParentWeeklyDigest();
  return { statusCode: 200 };
});
