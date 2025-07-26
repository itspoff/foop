import { showMissionList } from "../utils/formatLabels.js";

export default {
  prefix: "missions_",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");
    const displayMissions = await showMissionList(interaction, user, missions, null, "", false);
    await interaction.reply({ content: displayMissions, ephemeral: true });
  },
};
