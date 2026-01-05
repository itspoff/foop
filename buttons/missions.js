import { MessageFlags } from "discord.js";
import { formatMissionList } from "../utils/formatter.js";
import { MissionTabOptions } from "../selects/missionTabSelect.js";

export default {
  prefix: "missions_",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");
    const displayMissions = await formatMissionList(interaction, user, missions, MissionTabOptions.ALL);
    await interaction.reply({ components: displayMissions, flags: MessageFlags.Ephemeral });
  },
};
