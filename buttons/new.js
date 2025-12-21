import { MessageFlags } from "discord.js";
import { getConfirmStatusRow } from "../components/buttonRows.js";
import { getNewMissionModal } from "../modals/newMissionModal.js";

export default {
  prefix: "new_",

  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      const openStatus = getConfirmStatusRow(user);
      return interaction.reply({
        components: [openStatus],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    const modal = getNewMissionModal();
    return interaction.showModal(modal);
  },
};
