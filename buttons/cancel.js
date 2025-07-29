import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextDisplayBuilder } from "discord.js";
import { capitalizeFirstLetter } from "../utils/formatLabels.js";
import { getMissionButtonRow } from "../utils/buttonRows.js";
import { formatReminder } from "../utils/formatReminder.js";
import { ObjectId } from "mongodb";

export default {
  prefix: "cancel_",
  async execute(interaction, { db, user, value }) {
    const reminders = db.collection("reminders");

    const values = value.split("_");
    const reminderId = values[0];
    const ogUserId = values[1];

    const reminder = await reminders.findOne({ _id: new ObjectId(reminderId) });

    if (ogUserId !== user._id) {
      return interaction.reply({
        content: "> `❌ This isn't your reminder!`",
        ephemeral: true,
      });
    }

    if (!reminder) {
      return interaction.reply({
        content: "> `❌ Reminder not found.`",
        ephemeral: true,
      });
    }

    await reminders.deleteOne({ _id: new ObjectId(reminderId) });

    const text = new TextDisplayBuilder().setContent(
      `\`🔔\` \`${capitalizeFirstLetter(reminder.reminder)}\` \`has been cancelled.\``
    );
    await interaction.update({
      components: [text],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
