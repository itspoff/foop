export function formatMood(mood) {
  const moodMap = {
    great: "`☀️GREAT`",
    good: "`🌤️GOOD`",
    normal: "`🌥️NORMAL`",
    bad: "`🌧️BAD`",
    awful: "`⛈️AWFUL`",
  };

  return moodMap[mood?.toLowerCase()] || "🌥️ NORMAL";
}

export function formatEnergy(energy) {
  if (energy <= 10) return `\`🌑${energy}\``;
  if (energy <= 30) return `\`🌒${energy}\``;
  if (energy <= 60) return `\`🌓${energy}\``;
  if (energy <= 90) return `\`🌔${energy}\``;
  return `\`🌕${energy}\``;
}

export function formatDisplayName(name) {
  return `*\`${name.toUpperCase()}   \`*`;
}

export function formatDisplayTag(tag) {
  if (tag) return `\`${tag.name}\``;
  else return "";
}
export function formatPulledTag(tag) {
  if (tag) return `-#  ||\`${tag.name}\`|| `;
  else return "";
}

export function timeSince(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function formatDisplayMission(mission) {
  const emoji = mission.is_complete ? "💮" : "⭕️";
  const code = mission.code || "0000";
  return `> \`${emoji}\`  ${
    mission.is_complete ? "~~" : ""
  }\`${capitalizeFirstLetter(mission.name)}\`${
    mission.is_complete ? "~~" : ""
  } \`🏷️${code}\``;
}

export function formatMission(mission) {
  const code = mission.code || "0000";
  return `\`${capitalizeFirstLetter(mission.name)}\`\`🏷️${code}\``;
}

export function formatLockedInMission(mission) {
  if (!mission) {
    return `\`🕸️ Nothing here...\``;
  }

  const code = mission.code || "0000";
  return `\`📌 ${capitalizeFirstLetter(
    mission.name
  )}\` \`🏷️${code}\`  \`⏱️ ${timeSince(mission.locked_in_at)}\``;
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function formatReason(reason) {
  if (!reason) return "";

  const trimmed = reason.trim();
  if (trimmed.length === 0) return "";

  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  const sentence = capitalized.endsWith(".", "?", "!")
    ? capitalized
    : capitalized + ".";
  return `\`💬 ${sentence}\``;
}
