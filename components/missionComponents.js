import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ContainerBuilder } from "discord.js";
import { sortMissions, capitalizeFirstLetter, formatDisplayMission } from "../utils/formatter.js";
import { DateTime } from "luxon";
import { getMissionButtonRow } from "./buttonRows.js";
import { formatTime } from "../utils/formatTime.js";
import { getExistingUserFromId } from "../utils/getOrCreateUser.js";

export const MissionSelectOperations = {
  COMPLETE: { placeholder: "Select mission(s) to complete.", id: "complete" },
  DELETE: { placeholder: "Select mission(s) to delete.", id: "delete" },
  LOCKIN: { placeholder: "Select a mission to lock in on.", id: "lockin" },
  VIEW: { placeholder: "Select a mission to view.", id: "view" },
};

export function getMissionSelector(missionArray, options = MissionSelectOperations.COMPLETE) {
  if (missionArray.length === 0) {
    return interaction.reply({
      content: "❌ Couldn't find any selected missions.",
      ephemeral: true,
    });
  }
  const sortedMissions = sortMissions(missionArray);
  const select = new StringSelectMenuBuilder()
    .setCustomId(`missionSelect_${options.id}`)
    .setPlaceholder(options.placeholder)
    .addOptions(
      sortedMissions.map((mission) => {
        let desc = [];
        if (mission.description) desc.push(mission.description?.slice(0, 100) + " ");
        if (mission.is_daily) desc.push("Daily ");
        if (mission.locked_in_at) desc.push("Locked In");
        const descString = desc.join(" - ");
        return new StringSelectMenuOptionBuilder()
          .setLabel(capitalizeFirstLetter(mission.name.slice(0, 100)))
          .setValue(mission._id.toString())
          .setDescription(descString || " ");
      })
    );

  if (options === MissionSelectOperations.COMPLETE || options === MissionSelectOperations.DELETE) {
    if (missionArray.length) {
      select.setMinValues(1).setMaxValues(sortedMissions.length);
    }
  }

  return new ActionRowBuilder().addComponents(select);
}

export async function getMissionCard(mission) {
  const createdAtFormatted = DateTime.fromJSDate(mission.date_created).toFormat("yyyy-MM-dd HH:mm");
  let count = 1;
  if (mission.count && mission.count > 0) {
    count = mission.count;
  }

  let cheerNames = "";
  if (Array.isArray(mission.cheers) && mission.cheers.length > 0) {
    const cheerUsers = await Promise.all(mission.cheers.map((userId) => getExistingUserFromId(userId)));
    cheerNames = cheerUsers.map((user) => user?.display_name ?? "Unknown").join(", ");
  }
  let stats = `
> \`🏷️\` \`Created at:      \` \`${createdAtFormatted}\`${
    mission.is_daily ? `\n> \`🔥\` \`Current Streak:  \` \`${mission.current_streak}\`` : ""
  }
> \`⏱️\` \`Time Elapsed:    \` \`${formatTime(mission.time_taken)}\`${
    cheerNames.length ? `\n\`👏 ${cheerNames} cheered for this mission!\`` : ""
  }
`;

  const cardText = `## ${formatDisplayMission(mission, false)}
${mission.description ? `*\`${mission.description}\`*` : ""}
${stats}
  `;

  let { disableLockIn = false, disableComplete = false, disableCheer = false, lockedInMission = false } = {};

  if (mission.locked_in_at) {
    lockedInMission = true;
  } else {
    disableCheer = true;
  }
  if (mission.is_complete) {
    disableLockIn = true;
    disableComplete = true;
    disableCheer = true;
  }
  const buttons = getMissionButtonRow(mission._id, mission.user_id, {
    lockedInMission,
    disableLockIn,
    disableComplete,
    disableCheer,
  });

  const missionCard = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(cardText))
    .addSeparatorComponents((separator) => separator)
    .addActionRowComponents(buttons);

  return missionCard;
}
