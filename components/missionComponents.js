import {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ContainerBuilder,
  ModalBuilder,
  LabelBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { sortMissions, capitalizeFirstLetter, formatDisplayMission } from "../utils/formatter.js";
import { DateTime } from "luxon";
import { formatTime } from "../utils/formatTime.js";
import { getExistingUserFromId } from "../utils/getOrCreateUser.js";

export const MissionSelectOperations = {
  COMPLETE: {
    placeholder: "Select mission(s).",
    id: "complete",
    title: "Completing...",
    label: "Mission(s) to complete:",
  },
  DELETE: {
    placeholder: "Select mission(s).",
    id: "delete",
    title: "Deleting...",
    label: "Mission(s) to delete:",
  },
  LOCKIN: {
    placeholder: "Select a mission.",
    id: "lockin",
    title: "Locking in...",
    label: "Mission to lock in on:",
  },
  VIEW: { placeholder: "Select a mission.", id: "view", title: "Viewing...", label: "Mission(s) to view:" },
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
    .setCustomId(`${options.id}_select`)
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

  if (options !== MissionSelectOperations.LOCKIN) {
    if (missionArray.length) {
      select.setMinValues(1).setMaxValues(sortedMissions.length);
    }
  }

  return select;
}

export function getMissionActionModal(missionArray, options = MissionSelectOperations.COMPLETE) {
  const modal = new ModalBuilder().setCustomId(`${options.id}_modal_submit`).setTitle(options.title);
  const StringSelectMenu = getMissionSelector(missionArray, options);

  const selectLabel = new LabelBuilder().setLabel(options.label).setStringSelectMenuComponent(StringSelectMenu);
  modal.addLabelComponents(selectLabel);

  return modal;
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
export function getMissionListButtonRow(user, options = {}) {
  const userId = user._id;

  const {
    disableAddMission = false,
    disableLockIn = false,
    disableCheckOut = false,
    disableComplete = false,
    disableView = false,
    disableDelete = false,
    lockedInMission = false,
  } = options;

  const newMissionButton = new ButtonBuilder()
    .setCustomId(`new_${userId}`)
    .setLabel("🌱 New mission")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disableAddMission);

  let lockInButton = new ButtonBuilder()
    .setCustomId(`lockin_0_${userId}`)
    .setLabel("🔐 Lock in")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableLockIn);

  let completeButton = new ButtonBuilder()
    .setCustomId(`complete_0_${userId}`)
    .setLabel("🐾 Complete")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableComplete);

  if (lockedInMission) {
    const missionId = lockedInMission._id;

    const checkOutButton = new ButtonBuilder()
      .setCustomId(`checkout_${missionId}_status_${userId}`)
      .setLabel("💨 Check out")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disableCheckOut);

    lockInButton = checkOutButton;
    completeButton = new ButtonBuilder()
      .setCustomId(`complete_${missionId}_status_${userId}`)
      .setLabel("🐾 Complete")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disableComplete);
  }

  const viewButton = new ButtonBuilder()
    .setCustomId(`view_${userId}`)
    .setLabel("📇 View")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableView);

  const deleteButton = new ButtonBuilder()
    .setCustomId(`delete_${userId}`)
    .setLabel("💢 Delete")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disableDelete);

  return new ActionRowBuilder().addComponents(newMissionButton, lockInButton, completeButton, viewButton, deleteButton);
}

export function getMissionButtonRow(missionId, userId, options = {}) {
  const {
    disableLockIn = false,
    disableCheckOut = false,
    disableComplete = false,
    disableDelete = false,
    disableCheer = false,
    disableEdit = true,
    lockedInMission = false,
  } = options;

  let lockInButton = new ButtonBuilder()
    .setCustomId(`lockin_${missionId}_${userId}`)
    .setLabel("🔐 Lock in")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableLockIn);

  let completeButton = new ButtonBuilder()
    .setCustomId(`complete_${missionId}_${userId}`)
    .setLabel("🐾 Complete")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableComplete);

  if (lockedInMission) {
    const checkOutButton = new ButtonBuilder()
      .setCustomId(`checkout_${missionId}_card_${userId}`)
      .setLabel("💨 Check out")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disableCheckOut);
    lockInButton = checkOutButton;
    completeButton.setStyle(ButtonStyle.Primary);
  }

  const cheerButton = new ButtonBuilder()
    .setCustomId(`cheer_${missionId}_card_${userId}`)
    .setLabel("👏 Cheer")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableCheer);

  const editButton = new ButtonBuilder()
    .setCustomId(`edit_${missionId}_card_${userId}`)
    .setLabel("✒️ Edit")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableEdit);

  const deleteButton = new ButtonBuilder()
    .setCustomId(`delete_${missionId}_card_${userId}`)
    .setLabel("💢 Delete")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disableDelete);

  return new ActionRowBuilder().addComponents(lockInButton, completeButton, cheerButton, editButton, deleteButton);
}
