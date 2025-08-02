import { timeSince } from "./formatTime.js";

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

export function formatReason(reason) {
  if (!reason) return "";

  const trimmed = reason.trim();
  if (trimmed.length === 0) return "";

  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  const sentence = capitalized.endsWith(".", "?", "!") ? capitalized : capitalized + ".";
  return `\`💬\` \`${sentence}\``;
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

export function formatThoughtBubble(bubble) {
  if (bubble) {
    return `\`💭 ${bubble}\``;
  }
}

export async function showMissionList(
  interaction,
  user,
  missions,
  highlightCode = null,
  highlightText = "",
  followUp = true
) {
  const all = await missions.find({ user_id: user._id }).toArray();

  const sorted = all.sort((a, b) => {
    const getPriority = (m) => {
      if (m.is_daily && m.is_complete) return 0;
      if (m.is_daily && !m.is_complete) return 1;
      if (!m.is_daily && m.is_complete) return 2;
      return 3;
    };

    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    if (priorityA !== priorityB) return priorityA - priorityB;

    return new Date(b.created_at) - new Date(a.created_at);
  });

  const completed = sorted.filter((m) => m.is_complete);

  const dailyMissions = sorted.filter((m) => m.is_daily);
  const otherMissions = sorted.filter((m) => !m.is_daily);

  const formatWithHighlight = (m) => {
    const label = formatDisplayMission(m);
    return m.code === highlightCode ? `${label} \`${highlightText}\`` : label;
  };

  const dailyList = dailyMissions.map(formatWithHighlight).join("\n");
  const otherList = otherMissions.map(formatWithHighlight).join("\n");

  const msg = [dailyList, otherList].filter(Boolean).join("\n\n"); // add space if both groups exist

  const content = `### \`Today's Missions:\` \`${completed.length} / ${sorted.length}\`\n${msg}`;

  if (followUp) {
    return interaction.reply({ content });
  } else {
    return content;
  }
}

export function formatMission(mission) {
  const code = mission.code || "0000";
  return `\`${capitalizeFirstLetter(mission.name)}\` \`🏷️${code}\``;
}

export function formatDisplayMission(mission) {
  var emoji = mission.is_complete ? "💮" : "⭕️";
  if (mission.locked_in_at) {
    emoji = "🔐";
  }
  const code = mission.code || "0000";
  return `> \`${emoji}\`  ${mission.is_complete ? "~~" : ""}\`${capitalizeFirstLetter(mission.name)}\`${
    mission.is_complete ? "~~" : ""
  } \`🏷️${code}\``;
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

export function formatHelpText(string) {
  return `\n-# *${string}*`;
}
