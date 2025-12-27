import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType, MessageFlags } from "discord.js";
import { getMissionListDisplay } from "../utils/formatLabels.js";

export const data = new ContextMenuCommandBuilder()
  .setName("Reload Mission List")
  .setType(ApplicationCommandType.Message)
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);

export async function execute(interaction, db) {
  const target = interaction.targetMessage;
  try {
    const updatedList = await getMissionListDisplay(interaction, db);
    // const channel = interaction.channel ?? (await interaction.client.channels.fetch(interaction.channelId));

    await target.edit(updatedList);
    await interaction.reply({ content: "> `✅ Reloaded missions.`", ephemeral: true });
  } catch (error) {
    console.error("Failed to reload mission list:", error);
    return interaction.reply({
      content: "> `❌ Error: Could not reload the mission list.`",
      ephemeral: true,
    });
  }
}
