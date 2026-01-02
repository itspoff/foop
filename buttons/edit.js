import { ObjectId } from "mongodb";
import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { getEditMissionModal } from "../modals/editMissionModal.js";

export default {
  prefix: "edit_",

  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      return interaction.reply({
        components: [new TextDisplayBuilder().setContent("> `🥀 This isn't your button.`")],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    const missions = db.collection("missions");
    const [missionId, parent] = value.split("_");

    const mission = await missions.findOne({
      _id: ObjectId.createFromHexString(missionId),
    });

    const modal = getEditMissionModal(mission);

    return interaction.showModal(modal);
  },
};
