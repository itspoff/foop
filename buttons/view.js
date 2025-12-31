import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { getMissionActionModal, getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";
import { getConfirmStatusRow } from "../components/buttonRows.js";

export default {
  prefix: "view_",
  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      const openStatus = getConfirmStatusRow(user);
      return interaction.reply({
        components: [openStatus],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }
    const missions = db.collection("missions");

    const missionArray = await missions.find({ user_id: user._id }).toArray();
    const modal = getMissionActionModal(missionArray, MissionSelectOperations.VIEW);

    return interaction.showModal(modal);
  },
};
