import { ActionRowBuilder, MessageFlags, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import { formatTime, getCurrentPST, timeSince } from "./formatTime.js";
import { getOrCreateUser } from "./getOrCreateUser.js";
import { getStatusButtonRow } from "../components/buttonRows.js";
import { getMissionListButtonRow } from "../components/missionComponents.js";
import { getMissionTabSelector, MissionTabOptions } from "../selects/missionTabSelect.js";
import { getCheerStatus } from "../modals/cheerModal.js";

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
  if (!name) return "";
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
}

export function formatThoughtBubble(bubble) {
  if (bubble) {
    return `\`💭 ${bubble}\``;
  }
}

export function createProgressBar(current, total, size = 9) {
  if (!total || total <= 0) return `\`${"🌑".repeat(size)}\``;

  const progress = Math.min(Math.max(current / total, 0), 1);
  const steps = ["💨", "💨", "💧", "💧", "💦", "💦", "🌊", "🌠", "💢", "🎺"];
  const markIndex = Math.min(Math.floor(progress * steps.length), steps.length - 1);
  const mark = steps[markIndex];

  const totalValue = progress * size;
  const filledCount = Math.floor(totalValue);
  const partialValue = totalValue % 1;

  let bar = "🌕".repeat(filledCount);

  if (filledCount < size) {
    if (partialValue >= 0.875) {
      bar += "🌕";
    } else if (partialValue >= 0.625) {
      bar += "🌖";
    } else if (partialValue >= 0.375) {
      bar += "🌗";
    } else if (partialValue >= 0.125) {
      bar += "🌘";
    } else {
      bar += "🌑";
    }
  }

  // fill rest with empty
  const currentLength = Array.from(bar).length;
  if (currentLength < size) {
    bar += "🌑".repeat(size - currentLength);
  }

  if (progress == 1) {
    bar = "🌝".repeat(size);
  }

  return `\`${mark} ${bar}\``;
}

export async function formatMissionList(interaction, user, missions, options = {}) {
  const all = await missions
    .find({ user_id: user._id, ...(options.selected_tab == 1 && { is_daily: true }) })
    .toArray();
  const sorted = sortMissions(all);

  const completed = sorted.filter((m) => m.is_complete);
  const dailyMissions = sorted.filter((m) => m.is_daily);
  const otherMissions = sorted.filter((m) => !m.is_daily);

  const formatWithHighlight = (m) => {
    const label = formatDisplayMission(m);
    return label;
  };

  const dailyList = dailyMissions.map(formatWithHighlight).join("\n");
  const otherList = otherMissions.map(formatWithHighlight).join("\n");

  const msg = [dailyList, otherList].filter(Boolean).join("\n\n");

  const content = `### \`${getCurrentPST().toISODate()}\` \`Completed: ${completed.length} / ${
    sorted.length
  }\`\n${msg}`;

  return content;
}

export function sortMissions(missions) {
  const getPriority = (m) => {
    if (m.is_daily && m.is_complete) return 0;
    if (m.is_daily && !m.is_complete) return 1;
    if (!m.is_daily && m.is_complete) return 2;
    return 3;
  };

  return [...missions].sort((a, b) => {
    const priorityA = getPriority(a);
    const priorityB = getPriority(b);
    if (priorityA !== priorityB) return priorityA - priorityB;
    return new Date(b.date_created) - new Date(a.date_created);
  });
}

export function formatMission(mission) {
  return `\`${capitalizeFirstLetter(mission.name)}\``;
}

export function formatDisplayMission(mission, quoted = true) {
  let emoji = "⭕️";
  if (mission.locked_in_at) {
    emoji = "🔐";
  }
  if (mission.is_complete) {
    emoji = "💮";
  }

  let timer = "";
  if (mission.time_taken) {
    timer = ` \`⏱️ ${formatTime(mission.time_taken)}\``;
  }

  let streak = "";
  if (mission.is_daily && mission.current_streak >= 2) {
    streak = ` \`🔥 ${mission.current_streak}\``;
  }

  return `${quoted ? "> " : ""}\`${emoji}\`  ${mission.is_complete ? "~~" : ""}\`${capitalizeFirstLetter(
    mission.name
  )}\`${mission.is_complete ? "~~" : ""}${timer}${streak}`;
}

export function formatLockedInMission(mission) {
  if (!mission) {
    return `\`🕸️ Nothing here...\``;
  }

  return `\`🔐\` \`${capitalizeFirstLetter(mission.name)}\` \`⏲️ ${timeSince(mission.locked_in_at)}\``;
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function formatHelpText(string) {
  return `\n-# *${string}*`;
}

export async function getStatusPayload(interaction, db, targetUser = null) {
  const discordUser = targetUser ? await interaction.client.users.fetch(targetUser._id) : interaction.user;
  const missions = db.collection("missions");

  const user = await getOrCreateUser(discordUser);
  const [activeTag, lockedInMission, missionsCompletedCount, missionCount] = await Promise.all([
    user.active_tag ? db.collection("tags").findOne({ code: user.active_tag }) : null,
    missions.findOne({ user_id: user._id, locked_in_at: { $ne: null } }),
    missions.countDocuments({ user_id: user._id, is_complete: true }),
    missions.countDocuments({ user_id: user._id }),
  ]);

  const displayName = formatDisplayName(user.display_name || discordUser.globalName);
  const mood = formatMood(user.mood || "normal");
  const energy = formatEnergy(user.energy ?? 100);
  const lastUpdated = user.last_updated ? `${timeSince(user.last_updated)} ago` : "unknown";

  const displayTagStr = activeTag ? `${formatDisplayTag(activeTag)}  | ` : "";
  const thoughtBubble = formatThoughtBubble(user.thought_bubble) || "`🧠 Head empty. No thoughts.`";
  const progressString = createProgressBar(missionsCompletedCount, missionCount);

  const cheerStatus = await getCheerStatus(user);

  const statusUpdate = [
    `## ${displayName}  ${mood}  ${energy}`,
    `-#  ${displayTagStr}\`Last Updated: ${lastUpdated}\`  |  \`PPts: ${user.ppts}\`  |  \`Cheers: ${cheerStatus.currentBalance} / 3\``,
    `> **\`Current thought: \`** ${thoughtBubble}`,
    `> **\`Locked in on:    \`** ${formatLockedInMission(lockedInMission)}`,
    `> **\`Missions:        \`** ${progressString}`,
  ].join("\n");

  const headerSection = new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(statusUpdate))
    .setThumbnailAccessory(new ThumbnailBuilder().setDescription("Status").setURL(discordUser.displayAvatarURL()));

  return {
    components: [headerSection, getStatusButtonRow(user, lockedInMission)],
    flags: MessageFlags.IsComponentsV2,
  };
}

export async function getMissionListDisplay(interaction, db, options = MissionTabOptions.ALL) {
  const missions = db.collection("missions");
  const user = await getOrCreateUser(interaction.user);

  const displayMissions = await formatMissionList(interaction, user, missions, options);
  const missionsList = new TextDisplayBuilder().setContent(displayMissions);

  const lockedInMission = await missions.findOne({
    user_id: user._id,
    locked_in_at: { $ne: null },
  });
  const tabSelector = new ActionRowBuilder().addComponents(getMissionTabSelector(user, options));
  const footer = getMissionListButtonRow(user, { lockedInMission });

  return {
    components: [tabSelector, missionsList, footer],
    flags: MessageFlags.IsComponentsV2,
  };
}
