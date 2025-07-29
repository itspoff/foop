import { InteractionContextType, MessageFlags, SlashCommandBuilder, TextDisplayBuilder } from "discord.js";
import connectToDatabase from "../db.js";
import * as chrono from "chrono-node";
import { formatReminder } from "../utils/formatReminder.js";
import { getReminderRow } from "../utils/buttonRows.js";

export const data = new SlashCommandBuilder()
  .setName("remindme")
  .setDescription("Create a reminder")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addStringOption((option) =>
    option.setName("time").setDescription('When to remind me (e.g. "in 2 hours")').setRequired(true)
  )
  .addStringOption((option) => option.setName("reminder").setDescription("What to remind me about").setRequired(true));

export async function execute(interaction) {
  const db = await connectToDatabase();
  const timeInput = interaction.options.getString("time");
  const reminderText = interaction.options.getString("reminder").toLowerCase();
  const remindAt = chrono.parseDate(timeInput, new Date(), { forwardDate: true });

  if (!remindAt) {
    return interaction.reply({ content: "> `❌ Invalid time input.`", ephemeral: true });
  }

  const newReminder = {
    user_id: interaction.user.id,
    channel_id: interaction.channel.id,
    reminder: reminderText,
    remind_at: remindAt,
    created_at: new Date(),
    sent: false,
  };

  await db.collection("reminders").insertOne(newReminder);
  const textContent = formatReminder(newReminder);
  const text = new TextDisplayBuilder().setContent(textContent);
  const buttons = getReminderRow(interaction.user, newReminder);

  return interaction.reply({
    components: [text, buttons],
    flags: MessageFlags.IsComponentsV2,
  });
}
