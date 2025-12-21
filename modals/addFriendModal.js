import { LabelBuilder, ModalBuilder, TextDisplayBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";

export async function getAddFriendModal(interaction) {
  const targetUser = await getOrCreateUser(interaction.targetUser);
  const modal = new ModalBuilder()
    .setCustomId(`friend_modal_submit`)
    .setTitle(`Add ${targetUser.display_name} as a friend`);

  // TODO: text
  const textDescription = new TextDisplayBuilder().setContent(`Description.`);

  const messageInput = new TextInputBuilder()
    .setCustomId("friend_modal_message")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const messageLabel = new LabelBuilder().setLabel("Add a message").setTextInputComponent(messageInput);

  modal.addTextDisplayComponents(textDescription).addLabelComponents(messageLabel);
  return modal;
}
