import { DateTime } from "luxon";
import { capitalizeFirstLetter } from "./formatter.js";

export function formatReminder(reminder) {
  const remindAt = DateTime.fromJSDate(reminder.remind_at, {
    zone: "America/Los_Angeles",
  });
  const reminderText = capitalizeFirstLetter(reminder.reminder);

  const unixTime = Math.floor(remindAt.toSeconds());

  const absolute = remindAt.toFormat("ccc, LLL dd, h:mm a"); // e.g., "Thu, Jul 25, 2:00 PM"
  const relative = `<t:${unixTime}:R>`; // Discord relative time

  return `\`🔔\` \`${reminderText}\` \`⏲️ set for ${absolute}\` (${relative})`;
}
