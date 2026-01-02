import { MessageFlags } from "discord.js";
import { getNewMissionModal } from "../modals/newMissionModal.js";

export default {
  prefix: "new_",

  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      return interaction.reply({
        components: [new TextDisplayBuilder().setContent("> `🥀 This isn't your button.`")],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    const modal = getNewMissionModal();
    return interaction.showModal(modal);
  },
};
