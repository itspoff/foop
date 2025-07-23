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

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export async function showMissionList(
  interaction,
  user,
  missions,
  highlightCode = null,
  highlightText = "",
  followUp = true
) {
  const all = await missions.find({ user_id: user._id }).sort({ created_at: -1 }).toArray();

  // 1. Daily missions
  // 2. Completed missions
  // 3. Everything else
  const sorted = all.sort((a, b) => {
    // daily
    if (a.type === "daily" && b.type !== "daily") return -1;
    if (b.type === "daily" && a.type !== "daily") return 1;

    // completed
    if (a.is_complete && !b.is_complete) return -1;
    if (b.is_complete && !a.is_complete) return 1;

    // created_at descending
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const completed = sorted.filter((m) => m.is_complete);

  const msg = sorted
    .map((m) => {
      const label = formatDisplayMission(m);
      if (m.code === highlightCode) return `${label} \`${highlightText}\``;
      return label;
    })
    .join("\n");

  if (followUp) {
    return interaction.followUp({
      content: `### \`Today's Missions:\` \`${completed.length} / ${sorted.length}\`\n${msg}`,
    });
  } else {
    return `### \`Today's Missions:\` \`${completed.length} / ${sorted.length}\`\n${msg}`;
  }
}

export function formatDisplayMission(mission) {
  const emoji = mission.is_complete ? "💮" : "⭕️";
  const code = mission.code || "0000";
  return `> \`${emoji}\`  ${mission.is_complete ? "~~" : ""}\`${capitalizeFirstLetter(mission.name)}\`${
    mission.is_complete ? "~~" : ""
  } \`🏷️${code}\``;
}

// unused
export function formatMission(mission) {
  const code = mission.code || "0000";
  return `\`${capitalizeFirstLetter(mission.name)}\` \`🏷️${code}\``;
}

export function formatLockedInMission(mission) {
  if (!mission) {
    return `\`🕸️ Nothing here...\``;
  }

  const code = mission.code || "0000";
  return `\`📌 ${capitalizeFirstLetter(mission.name)}\` \`🏷️${code}\`  \`⏱️ ${timeSince(mission.locked_in_at)}\``;
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function formatReason(reason) {
  if (!reason) return "";

  const trimmed = reason.trim();
  if (trimmed.length === 0) return "";

  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  const sentence = capitalized.endsWith(".", "?", "!") ? capitalized : capitalized + ".";
  return `\`💬 ${sentence}\``;
}

export function formatConditionList(conditions) {
  if (conditions.length === 0) {
    return "";
  }
  const msg = conditions
    .map((c) => {
      const label = formatCondition(c);
      return label;
    })
    .join(" ");
  return msg;
}

export function formatCondition(condition) {
  if (condition) {
    const emoji = condition.is_positive ? "🟠" : "🔵";
    const name = capitalizeFirstLetter(condition.name);
    return `\`${emoji} ${name}\``;
  }

  console.log("Could not format condition.");
}
