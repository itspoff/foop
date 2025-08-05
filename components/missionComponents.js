import {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { sortMissions, capitalizeFirstLetter, formatDisplayMission } from "../utils/formatLabels.js";
import { DateTime } from "luxon";
import { getMissionButtonRow } from "../utils/buttonRows.js";
import { formatTime } from "../utils/formatTime.js";

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
        const desc = mission.is_daily ? "Daily" : " ";
        return new StringSelectMenuOptionBuilder()
          .setLabel(capitalizeFirstLetter(mission.name.slice(0, 100)))
          .setValue(mission.code)
          .setDescription(mission.description?.slice(0, 100) || desc);
      })
    );

  if (options === MissionSelectOperations.COMPLETE || options === MissionSelectOperations.DELETE) {
    if (missionArray.length) {
      select.setMinValues(1).setMaxValues(sortedMissions.length);
    }
  }

  return new ActionRowBuilder().addComponents(select);
}

export function getMissionCard(mission) {
  const createdAtFormatted = DateTime.fromJSDate(mission.created_at).toFormat("yyyy-MM-dd HH:mm");
  let isDaily = mission.is_daily;
  let stats = `> \`🏷️\` \`Created at:      \` \`${createdAtFormatted}\``;
  if (isDaily) {
    stats = `
> \`🏷️\` \`Created at:      \` \`${createdAtFormatted}\`
> \`💯\` \`Daily Mission    \``;
  } else {
    stats = `
> \`🏷️\` \`Created at:      \` \`${createdAtFormatted}\`
> \`⏱️\` \`Time Elapsed:    \` \`${formatTime(mission.time_taken)}\``;
  }
  const cardText = `## ${formatDisplayMission(mission, false)}
${mission.description ? `*\`${mission.description}\`*` : ""}
${stats}
  `;
  let {
    disableLockIn = false,
    disableCheckOut = false,
    disableComplete = false,
    disableDelete = false,
    disableCheer = false,
    showCheckOut = false,
  } = {};

  if (mission.locked_in_at) {
    showCheckOut = true;
  } else {
    disableCheer = true;
  }
  if (mission.is_complete) {
    disableLockIn = true;
    disableComplete = true;
    disableCheer = true;
  }
  const buttons = getMissionButtonRow(mission.code, { showCheckOut, disableLockIn, disableComplete, disableCheer });

  const missionCard = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(cardText))
    .addSeparatorComponents((separator) => separator)
    .addActionRowComponents(buttons);

  return missionCard;
}
