import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";

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
    .setStyle(ButtonStyle.Secondary)
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

export function getStatusButtonRow() {
  const cheerButton = new ButtonBuilder()
    .setCustomId(`cheer_${""}}`)
    .setLabel("👏 Cheer")
    .setStyle(ButtonStyle.Primary);

  const packageButton = new ButtonBuilder()
    .setCustomId(`package_${""}}`)
    .setLabel("📦 Deliver a package")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  return new ActionRowBuilder().addComponents(cheerButton, packageButton);
}
