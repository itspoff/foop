import { ButtonBuilder, ButtonStyle, ActionRowBuilder, SectionBuilder } from "discord.js";

export function getMissionButtonRow(code, options = {}, isLockIn = true) {
  const {
    disableLockIn = false,
    disableCheckOut = false,
    disableComplete = false,
    disableDelete = false,
    disableMissions = false,
    disableCheer = false,
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

  const cheerButton = new ButtonBuilder()
    .setCustomId(`cheer_${code}`)
    .setLabel("👏 Cheer")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableCheer);

  return isLockIn
    ? new ActionRowBuilder().addComponents(lockInButton, completeButton, deleteButton, missionsButton, cheerButton)
    : new ActionRowBuilder().addComponents(checkOutButton, completeButton, deleteButton, missionsButton, cheerButton);
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

export function getConfirmCheerRow(user, code) {
  return new SectionBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`\`Spend 250 Ppts to cheer?\`\n-# \`You currently have: ${user.ppts} Ppts\``)
    )
    .setButtonAccessory((button) =>
      button.setCustomId(`cheer_${code}_confirm`).setLabel("⭕️ Confirm").setStyle(ButtonStyle.Danger)
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

export function getOwnStatusButtonRow(discordUser, options = {}) {
  const {
    disableAddMission = false,
    disableLockIn = true,
    disableCheckOut = true,
    disableComplete = true,
    disableProfile = false,
  } = options;

  const newMissionButton = new ButtonBuilder()
    .setCustomId(`new_`)
    .setLabel("🌱 New mission")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disableAddMission);

  const lockInButton = new ButtonBuilder()
    .setCustomId(`lockin_`) // if no code? modal?
    .setLabel("🔐 Lock in")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableLockIn);

  const checkOutButton = new ButtonBuilder()
    .setCustomId(`checkout_`)
    .setLabel("💨 Check out")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disableCheckOut);

  const completeButton = new ButtonBuilder()
    .setCustomId(`complete_`)
    .setLabel("🐾 Complete")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableComplete);

  const profileButton = new ButtonBuilder()
    .setCustomId(`profile_`)
    .setLabel("👤 My profile")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableProfile);

  return new ActionRowBuilder().addComponents(
    newMissionButton,
    lockInButton,
    // checkOutButton,
    completeButton,
    profileButton
  );
}

export function getDailyButtonRow(discordUser, options = {}) {
  const { disableMail = true, disableGarden = true, disableShop = true, disableProfile = false } = options;

  const mailboxButton = new ButtonBuilder()
    .setCustomId(`mail_`)
    .setLabel("📪 Mailbox")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disableMail);

  const gardenButton = new ButtonBuilder()
    .setCustomId(`garden_`)
    .setLabel("🐌 Garden")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableGarden);

  const shopButton = new ButtonBuilder()
    .setCustomId(`shop_`)
    .setLabel("🛒 Daily Shop")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disableShop);

  const profileButton = new ButtonBuilder()
    .setCustomId(`profile_`)
    .setLabel("👤 My profile")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableProfile);

  return new ActionRowBuilder().addComponents(mailboxButton, gardenButton, shopButton, profileButton);
}
