import { createNewMissionModal } from "../components/missionComponents.js";

export default {
  prefix: "new_",

  async execute(interaction, { db, user }) {
    const modal = createNewMissionModal();
    await interaction.showModal(modal);
  },
};
