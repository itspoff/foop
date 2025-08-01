import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";

const placeholders = [
  "", // default
  "Has anyone said you're the BEST yet today?",
  "Good good study, day day up.",
  "Is this task bothering you?",
  "You can do this, I believe in you!",
  "MY GOAT",
  "uuuuuuuuu umapyoi! umayaoi!",
  "It's what Himmel the Hero would have done.",
  "你来啦！小可爱！",
];

export default {
  prefix: "new_",

  async execute(interaction, { db, user }) {
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

    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(dailyInput);
    const row3 = new ActionRowBuilder().addComponents(descInput);
    modal.addComponents(row1, row2, row3);

    await interaction.showModal(modal);
  },
};
