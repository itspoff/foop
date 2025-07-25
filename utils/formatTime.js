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
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
