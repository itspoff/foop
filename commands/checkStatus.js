import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType } from "discord.js";
import { getAddFriendModal } from "../modals/addFriendModal.js";
import { getExistingUserFromId } from "../utils/getOrCreateUser.js";
import { getStatusHeader } from "../utils/formatLabels.js";

export const data = new ContextMenuCommandBuilder()
  .setName("check status")
  .setType(ApplicationCommandType.User)
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);

export async function execute(interaction, db) {
  const user = await getExistingUserFromId(interaction.user.id);

  const targetUser = await getExistingUserFromId(interaction.targetUser.id);
  if (!targetUser) {
    return interaction.reply({
      content: "> `❌ Cannot check status of this user.`",
      ephemeral: true,
    });
  }

  const targetUserStatus = await getStatusHeader(interaction, db, targetUser);

  return interaction.reply(targetUserStatus);
}
