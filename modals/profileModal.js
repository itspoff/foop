import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { getStatusMessage } from "../utils/formatLabels.js";

export function getProfileModal({ user, buttonOwnerId }) {
  const prevName = user.display_name;
  const prevBubble = user.thought_bubble ?? "";
  const prevDailyResetHour = (user.daily_reset_hour ?? 5).toString();

  const modal = new ModalBuilder().setCustomId(`profile_${buttonOwnerId}`).setTitle("My profile");

  const nameInput = new TextInputBuilder()
    .setCustomId("profile_display_name")
    .setLabel("Display Name")
    .setStyle(TextInputStyle.Short)
    .setValue(prevName)
    .setRequired(true);

  const bubbleInput = new TextInputBuilder()
    .setCustomId("profile_bubble")
    .setLabel("What's on your mind?")
    .setStyle(TextInputStyle.Short)
    .setValue(prevBubble)
    .setRequired(false)
    .setMaxLength(100);

  const resetTimeInput = new TextInputBuilder()
    .setCustomId("profile_reset_hour")
    .setLabel("Daily reset hour in PST (0–23)")
    .setStyle(TextInputStyle.Short)
    .setValue(prevDailyResetHour)
    .setRequired(true)
    .setMaxLength(2);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(bubbleInput),
    new ActionRowBuilder().addComponents(resetTimeInput)
  );

  return modal;
}

export default {
  prefix: "profile_",

  async execute(interaction, { db, user, value }) {
    const newName = interaction.fields.getTextInputValue("profile_display_name");
    const newBubble = interaction.fields.getTextInputValue("profile_bubble");
    const newResetHour = parseInt(interaction.fields.getTextInputValue("profile_reset_hour"));
    const buttonOwnerId = value;

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          display_name: newName,
          thought_bubble: newBubble,
          last_updated: getCurrentPST().toJSDate(),
          daily_reset_hour: newResetHour,
        },
      }
    );

    if (buttonOwnerId === user._id) {
      const editedStatus = await getStatusMessage(interaction, db);
      await interaction.update(editedStatus);
    } else {
      const text = new TextDisplayBuilder().setContent(`> \`Profile updated for ${user.display_name}.\``);
      await interaction.reply({
        components: [text],
        flags: [MessageFlags.IsComponentsV2],
      });
    }
  },
};
