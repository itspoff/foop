import { SlashCommandBuilder, InteractionContextType } from "discord.js";
import connectToDatabase from "../db.js";
import { getStatusMessage } from "../utils/formatLabels.js";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Send a status update!")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addUserOption((option) => option.setName("user").setDescription("User to check status of"));

export async function execute(interaction) {
  const db = await connectToDatabase();
  const selectedUser = interaction.options.getUser("user");
  const targetDiscordUser = selectedUser || interaction.user;

  const message = await getStatusMessage(targetDiscordUser, interaction, db);

  return interaction.reply(message);
}
