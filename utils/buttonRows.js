import { ButtonBuilder, ButtonStyle, ActionRowBuilder, SectionBuilder } from "discord.js";
import { formatMission } from "./formatLabels.js";

export function getMissionButtonRow(code, userId, options = {}) {
  const {
    disableLockIn = false,
    disableCheckOut = false,
    disableComplete = false,
    disableDelete = false,
    disableCheer = false,
    lockedInMission = false,
  } = options;

  let lockInButton = new ButtonBuilder()
    .setCustomId(`lockin_${code}_${userId}`)
    .setLabel("🔐 Lock in")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableLockIn);

  let completeButton = new ButtonBuilder()
    .setCustomId(`complete_${code}_${userId}`)
    .setLabel("🐾 Complete")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableComplete);

  if (lockedInMission) {
    const checkOutButton = new ButtonBuilder()
      .setCustomId(`checkout_${code}_card_${userId}`)
      .setLabel("💨 Check out")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disableCheckOut);
    lockInButton = checkOutButton;
    completeButton.setStyle(ButtonStyle.Primary);
  }

  const cheerButton = new ButtonBuilder()
    .setCustomId(`cheer_${code}_card_${userId}`)
    .setLabel("👏 Cheer")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableCheer);

  const deleteButton = new ButtonBuilder()
    .setCustomId(`delete_${code}_card_${userId}`)
    .setLabel("💢 Delete")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disableDelete);

  return new ActionRowBuilder().addComponents(lockInButton, completeButton, cheerButton, deleteButton);
}

export function getStatusButtonRow(user, isOtherUser, lockedInMission, options = {}) {
  const { disableCheer = false, disablePackage = true, disableClose = false } = options;
  const code = lockedInMission ? lockedInMission.code : "0";

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
      textDisplay.setContent(`\`Spend 25 Ppts to cheer?\`\n-# \`You currently have: ${user.ppts} Ppts\``)
    )
    .setButtonAccessory((button) =>
      button.setCustomId(`cheer_${code}_confirm_${user._id}`).setLabel("⭕️ Confirm").setStyle(ButtonStyle.Danger)
    );
}

export function getConfirmStatusRow(user) {
  return new SectionBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `\`This isn't your button!\`
            \n\`Open your status?\``
      )
    )
    .setButtonAccessory((button) =>
      button.setCustomId(`status_confirm_${user._id}`).setLabel("🧻 Status").setStyle(ButtonStyle.Success)
    );
}

export function getConfirmCheckOutRow(user, mission) {
  const alreadyLocked = mission;
  return new SectionBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `\`You are already locked in on:\` \`🔐\` ${formatMission(alreadyLocked)}\n\`Check out of this mission?\``
      )
    )
    .setButtonAccessory((button) =>
      button
        .setCustomId(`checkout_${alreadyLocked.code}_confirm_${user._id}`)
        .setLabel("💨 Check out")
        .setStyle(ButtonStyle.Primary)
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

export function getOwnStatusButtonRow(user, options = {}) {
  const userId = user._id;

  const {
    disableAddMission = false,
    disableLockIn = false,
    disableCheckOut = false,
    disableComplete = false,
    disableView = false,
    disableProfile = false,
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
    const checkOutButton = new ButtonBuilder()
      .setCustomId(`checkout_${lockedInMission.code}_status_${userId}`)
      .setLabel("💨 Check out")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disableCheckOut);

    lockInButton = checkOutButton;
    completeButton = new ButtonBuilder()
      .setCustomId(`complete_${lockedInMission.code}_status_${userId}`)
      .setLabel("🐾 Complete")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disableComplete);
  }

  const viewButton = new ButtonBuilder()
    .setCustomId(`view_${userId}`)
    .setLabel("📇 View")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableView);

  const profileButton = new ButtonBuilder()
    .setCustomId(`profile_${userId}`)
    .setLabel("👤 My profile")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disableProfile);

  return new ActionRowBuilder().addComponents(
    newMissionButton,
    lockInButton,
    completeButton,
    viewButton,
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
