import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  MessageFlags,
  Routes,
} from "discord.js";
import { getMissionListDisplay } from "../utils/formatLabels.js";

export const data = new ContextMenuCommandBuilder()
  .setName("Reload Mission List")
  .setType(ApplicationCommandType.Message)
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);

export async function execute(interaction, db) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const target = interaction.targetMessage;

  try {
    const updatedPayload = await getMissionListDisplay(interaction, db);

    await interaction.client.rest.patch(Routes.channelMessage(interaction.channelId, target.id), {
      body: {
        content: updatedPayload.content,
        components: updatedPayload.components,
        embeds: updatedPayload.embeds || [],
      },
    });

    await interaction.editReply({ content: "> `✅ Mission list refreshed.`" });
  } catch (error) {
    console.error("Failed to reload mission list:", error);

    await interaction.editReply({
      content: "> `❌ Error: Could not refresh the list. Use /missions instead.`",
    });
  }
}
