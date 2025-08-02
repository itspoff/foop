import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";

export default {
  prefix: "profile_",

  async execute(interaction, { db, user }) {
    const prevName = user.display_name;
    const prevBubble = user.thought_bubble ?? "";
    const modal = new ModalBuilder().setCustomId("profile_modal_submit").setTitle("My profile");

    const nameInput = new TextInputBuilder()
      .setCustomId("profile_display_name")
      .setLabel("Display Name")
      .setStyle(TextInputStyle.Short)
      .setValue(prevName)
      .setRequired(true);

    const bubbleInput = new TextInputBuilder()
      .setCustomId("profile_bubble")
      .setLabel("What's on your mind?")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(prevBubble)
      .setRequired(false)
      .setMaxLength(300);

    const row1 = new ActionRowBuilder().addComponents(nameInput);
    const row2 = new ActionRowBuilder().addComponents(bubbleInput);
    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  },
};
