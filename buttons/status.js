import { SlashCommandBuilder, InteractionContextType, MessageFlags } from "discord.js";
import connectToDatabase from "../db.js";
import { getStatusMessage } from "../utils/formatLabels.js";
import { getConfirmStatusRow } from "../utils/buttonRows.js";

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

export default {
  prefix: "status_",
  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      const openStatus = getConfirmStatusRow(user);
      return interaction.reply({
        components: [openStatus],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    const status = await getStatusMessage(interaction.user, interaction, db);
    return interaction.reply(status);
  },
};
