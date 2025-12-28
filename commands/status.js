import { SlashCommandBuilder, InteractionContextType, MessageFlags } from "discord.js";
import connectToDatabase from "../db.js";
import { getStatusPayload } from "../utils/formatter.js";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Send a status update!")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);

export async function execute(interaction, db) {
  const message = await getStatusPayload(interaction, db);

  return interaction.reply(message);
}
