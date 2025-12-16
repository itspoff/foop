import { ButtonStyle, MessageFlags, SectionBuilder } from "discord.js";
import { createNewMissionModal } from "../components/missionComponents.js";
import { getConfirmStatusRow } from "../components/buttonRows.js";

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

    const modal = createNewMissionModal();
    return interaction.showModal(modal);
  },
};
