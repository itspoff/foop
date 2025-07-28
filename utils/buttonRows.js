import { ButtonBuilder, ButtonStyle, ActionRowBuilder, SectionBuilder } from "discord.js";

export function getMissionButtonRow(code, options = {}, isLockIn = true) {
  const {
    disableLockIn = false,
    disableCheckOut = false,
    disableComplete = false,
    disableDelete = false,
    disableMissions = false,
  } = options;

  const lockInButton = new ButtonBuilder()
    .setCustomId(`lockin_${code}`)
    .setLabel("🔐 Lock in")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableLockIn);

  const checkOutButton = new ButtonBuilder()
    .setCustomId(`checkout_${code}`)
    .setLabel("💨 Check out")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disableCheckOut);

  const completeButton = new ButtonBuilder()
    .setCustomId(`complete_${code}`)
    .setLabel("🐾 Complete")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableComplete);

  const deleteButton = new ButtonBuilder()
    .setCustomId(`delete_${code}`)
    .setLabel("💢 Delete")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disableDelete);

  const missionsButton = new ButtonBuilder()
    .setCustomId(`missions_`)
    .setLabel("📖 Show missions")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableMissions);

  return isLockIn
    ? new ActionRowBuilder().addComponents(lockInButton, completeButton, deleteButton, missionsButton)
    : new ActionRowBuilder().addComponents(checkOutButton, completeButton, deleteButton, missionsButton);
}

export function getStatusButtonRow(user, isOtherUser, lockedInMission, options = {}) {
  const { disableCheer = false, disablePackage = true } = options;
  const code = lockedInMission ? lockedInMission.code : "0000";

  const cheerButton = new ButtonBuilder()
    .setCustomId(`cheer_${code}_${user._id}`)
    .setLabel("👏 Cheer")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableCheer);

  const packageButton = new ButtonBuilder()
    .setCustomId(`package_${""}}`)
    .setLabel("📦 Deliver a package")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disablePackage);

  return new ActionRowBuilder().addComponents(cheerButton, packageButton);
}

export function getConfirmCheerRow(user, code, userId) {
  // TODO: need target.name, user.ppts

  return new SectionBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`\`Spend 250 Ppts to cheer?\`\n-# \`You currently have: ${user.ppts} Ppts\``)
    )
    .setButtonAccessory((button) =>
      button.setCustomId(`cheer_${code}_${userId}_confirm`).setLabel("⭕️ Confirm").setStyle(ButtonStyle.Danger)
    );
}
