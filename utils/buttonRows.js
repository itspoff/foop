import { ButtonBuilder, ButtonStyle, ActionRowBuilder, SectionBuilder } from "discord.js";

export function getMissionButtonRow(code, options = {}, isLockIn = true) {
  const {
    disableLockIn = false,
    disableCheckOut = false,
    disableComplete = false,
    disableDelete = false,
    disableMissions = false,
    disableClose = false,
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

  const closeButton = new ButtonBuilder()
    .setCustomId(`close_`)
    .setLabel("✖️ Close")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableClose);

  return isLockIn
    ? new ActionRowBuilder().addComponents(lockInButton, completeButton, deleteButton, missionsButton, closeButton)
    : new ActionRowBuilder().addComponents(checkOutButton, completeButton, deleteButton, missionsButton, closeButton);
}

export function getStatusButtonRow(user, isOtherUser, lockedInMission, options = {}) {
  const { disableCheer = false, disablePackage = true, disableClose = false } = options;
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

  const closeButton = new ButtonBuilder()
    .setCustomId(`close_`)
    .setLabel("✖️ Close")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableClose);

  return new ActionRowBuilder().addComponents(cheerButton, packageButton, closeButton);
}

export function getConfirmCheerRow(user, code, userId) {
  return new SectionBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`\`Spend 250 Ppts to cheer?\`\n-# \`You currently have: ${user.ppts} Ppts\``)
    )
    .setButtonAccessory((button) =>
      button.setCustomId(`cheer_${code}_${userId}_confirm`).setLabel("⭕️ Confirm").setStyle(ButtonStyle.Danger)
    );
}

export function getReminderRow(discordUser, reminder, options = {}) {
  const { disableJoin = true, disableCancel = false } = options;
  const reminderId = reminder ? reminder._id : "";
  const userId = discordUser ? discordUser.id : "";

  const joinButton = new ButtonBuilder()
    .setCustomId(`join_${reminderId}_${userId}`)
    .setLabel("🙌 Remind me too!")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableJoin);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_${reminderId}_${userId}`)
    .setLabel("🚫 Cancel")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disableCancel);

  return new ActionRowBuilder().addComponents(joinButton, cancelButton);
}
