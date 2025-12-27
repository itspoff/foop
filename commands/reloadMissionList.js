import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType, MessageFlags } from "discord.js";
import { getMissionListDisplay } from "../utils/formatLabels.js";

export const data = new ContextMenuCommandBuilder()
  .setName("Reload Mission List")
  .setType(ApplicationCommandType.Message)
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);

export async function execute(interaction, db) {
  // DEFER
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const target = interaction.targetMessage;

  try {
    const updatedPayload = await getMissionListDisplay(interaction, db);

    // UPDATE message
    if (interaction.channel) {
      await interaction.channel.messages.edit(target.id, {
        content: updatedPayload.content,
        components: updatedPayload.components,
        embeds: updatedPayload.embeds || [],
      });
    } else {
      // fall back
      await target.edit(updatedPayload);
    }

    // UPDATE deferred reply
    await interaction.editReply({ content: "> `✅ Mission list refreshed.`" });
  } catch (error) {
    console.error("Failed to reload mission list:", error);

    return interaction.editReply({
      content: "> `❌ Error: Could not refresh the list.`",
    });
  }
}
