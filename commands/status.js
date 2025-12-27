import { SlashCommandBuilder, InteractionContextType } from "discord.js";
import connectToDatabase from "../db.js";
import { getStatusHeader } from "../utils/formatLabels.js";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Send a status update!")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);

export async function execute(interaction, db) {
  const message = await getStatusHeader(interaction, db);

  return interaction.reply(message);
}
