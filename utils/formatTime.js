import { DateTime } from "luxon";

export function formatTime(seconds) {
  seconds = Math.round(seconds);

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const result = [];
  if (days) result.push(`${days}d`);
  if (hours) result.push(`${hours}h`);
  if (mins) result.push(`${mins}m`);
  if (secs) result.push(`${secs}s`);

  return result.join(" ") || "0s";
}

export function timeSince(date) {
  const then = DateTime.fromJSDate(date);
  const seconds = DateTime.now().diff(then, "seconds").as("seconds");

  if (seconds < 60) return `${Math.floor(seconds)}s`;

  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m`;

  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h`;

  const days = hours / 24;

  return `${Math.floor(days)}d`;
}

export function getResetTimePST() {
  const now = DateTime.now().setZone("America/Los_Angeles");

  let resetTime = now.set({
    hour: 5,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  if (now < resetTime) {
    resetTime = resetTime.minus({ days: 1 });
  }

  return resetTime.toJSDate();
}
