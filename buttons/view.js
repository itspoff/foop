import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { getMissionActionModal, MissionSelectOperations } from "../components/missionComponents.js";

export default {
  prefix: "view_",
  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      return interaction.reply({
        components: [new TextDisplayBuilder().setContent("> `🥀 This isn't your button.`")],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }
    const missions = db.collection("missions");

    const missionArray = await missions.find({ user_id: user._id }).toArray();
    const modal = getMissionActionModal(missionArray, MissionSelectOperations.VIEW);

    return interaction.showModal(modal);
  },
};
