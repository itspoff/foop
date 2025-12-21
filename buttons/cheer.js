import { ObjectId } from "mongodb";
import { getCheerModal } from "../modals/cheerModal.js";
import { getExistingUserFromId } from "../utils/getOrCreateUser.js";

export default {
  prefix: "cheer_",
  async execute(interaction, { db, user, value }) {
    const missions = db.collection("missions");

    const values = value.split("_");
    let missionId = values[0];

    if (ObjectId.isValid(missionId)) {
      missionId = ObjectId.createFromHexString(missionId);
      const mission = await missions.findOne({
        _id: missionId,
        locked_in_at: { $ne: null },
      });

      if (!mission) {
        return interaction.reply({
          content: "> `❌ Mission not found or not locked in.`",
          ephemeral: true,
        });
      }
      if (user.ppts < 250) {
        return interaction.reply({
          content: "> `❌ You don't have enough points to cheer!`",
          ephemeral: true,
        });
      }

      const alreadyCheered = mission.cheers?.includes(user._id);
      if (alreadyCheered) {
        return interaction.reply({
          content: "> `❌ You already cheered for this mission.`",
          ephemeral: true,
        });
      }

      const userToCheer = await getExistingUserFromId(mission.user_id);
      const modal = getCheerModal(userToCheer.display_name, missionId);

      return interaction.showModal(modal);
    }
  },
};
