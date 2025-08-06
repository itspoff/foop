import {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { sortMissions, capitalizeFirstLetter, formatDisplayMission } from "../utils/formatLabels.js";
import { DateTime } from "luxon";
import { getMissionButtonRow } from "../utils/buttonRows.js";
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
        if (mission.description) desc.push(mission.descrption?.slice(0, 20) + " ");
        if (mission.is_daily) desc.push("Daily ");
        if (mission.locked_in_at) desc.push("Locked In");
        const descString = desc.join(" - ");
        return new StringSelectMenuOptionBuilder()
          .setLabel(capitalizeFirstLetter(mission.name.slice(0, 100)))
          .setValue(mission.code)
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
  let cheerNames = "";
  if (Array.isArray(mission.cheers) && mission.cheers.length > 0) {
    const cheerUsers = await Promise.all(mission.cheers.map((userId) => getExistingUserFromId(userId)));
    cheerNames = cheerUsers.map((user) => user?.display_name ?? "Unknown").join(", ");
  }
  let stats = `
> \`🏷️\` \`Created at:      \` \`${createdAtFormatted}\`${
    mission.is_daily ? `\n> \`💯\` \`Completion Rate: \` \`N/A\`` : ""
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
  const buttons = getMissionButtonRow(mission.code, mission.user_id, {
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

const placeholders = [
  "", // default
  "Has anyone said you're the BEST yet today?",
  "Good good study, day day up.",
  "Is this task bothering you?",
  "You can do this, I believe in you!",
  "MY GOAT",
  "Sending you energy to get through the day!",
  "uuuuuuuuu umapyoi! umayaoi!",
  "It's what Himmel the Hero would have done.",
  "你来啦！小可爱！",
];

export function createNewMissionModal() {
  const placeholder =
    Math.random() < 0.3 ? placeholders[0] : placeholders[Math.floor(Math.random() * (placeholders.length - 1)) + 1];

  const modal = new ModalBuilder().setCustomId("new_modal_submit").setTitle("Yeah—add this to the list.");

  const titleInput = new TextInputBuilder()
    .setCustomId("new_input_title")
    .setLabel("Mission Title")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(placeholder)
    .setRequired(true);

  const dailyInput = new TextInputBuilder()
    .setCustomId("new_input_daily")
    .setLabel("Is this task daily? (T/F)")
    .setStyle(TextInputStyle.Short)
    .setValue("F")
    .setPlaceholder("(Type T/F)")
    .setRequired(true)
    .setMaxLength(1)
    .setMinLength(1);

  const descInput = new TextInputBuilder()
    .setCustomId("new_input_desc")
    .setLabel("Description")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(dailyInput),
    new ActionRowBuilder().addComponents(descInput)
  );

  return modal;
}
