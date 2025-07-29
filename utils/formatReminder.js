import { capitalizeFirstLetter } from "./formatLabels.js";

export function formatReminder(reminder) {
  const remindAt = reminder.remind_at;
  const reminderText = capitalizeFirstLetter(reminder.reminder);

  const unixTime = Math.floor(remindAt.getTime() / 1000);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    month: "short",
    day: "numeric",
  });
  const absolute = formatter.format(remindAt); // "Thu, Jul 25, 2:00 PM"
  const relative = `<t:${unixTime}:R>`; // "in 2 hours"

  return `\`🔔\` \`${reminderText}\` \`⏲️ set for ${absolute}\` (${relative})`;
}
