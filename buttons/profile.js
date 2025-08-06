import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";

export default {
  prefix: "profile_",

  async execute(interaction, { db, user, value }) {
    const prevName = user.display_name;
    const prevBubble = user.thought_bubble ?? "";
    const prevDailyResetHour = (user.daily_reset_hour ?? 5).toString();
    const buttonOwnerId = value;
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
      .setLabel("Daily reset hour in PST (integer from 0-23)")
      .setStyle(TextInputStyle.Short)
      .setValue(prevDailyResetHour)
      .setRequired(true)
      .setMaxLength(2);

    const row1 = new ActionRowBuilder().addComponents(nameInput);
    const row2 = new ActionRowBuilder().addComponents(bubbleInput);
    const row3 = new ActionRowBuilder().addComponents(resetTimeInput);
    modal.addComponents(row1, row2, row3);

    await interaction.showModal(modal);
  },
};
