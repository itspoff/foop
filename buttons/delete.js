import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { capitalizeFirstLetter } from "../utils/formatter.js";
import { getConfirmStatusRow } from "../components/buttonRows.js";
import { getMissionActionModal, getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";
import { processMissionDeletion } from "../logic/missionLogic.js";
import { ObjectId } from "mongodb";

export default {
  prefix: "delete_",
  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      return interaction.reply({
        components: [getConfirmStatusRow(user)],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    const [missionIdStr] = value.split("_");
    const missions = db.collection("missions");

    if (ObjectId.isValid(missionIdStr)) {
      const missionId = ObjectId.createFromHexString(missionIdStr);

      try {
        const deletedMission = await processMissionDeletion(db, user, missionId);

        const successText = new TextDisplayBuilder().setContent(
          `\`Mission\` \`💢\` \`${capitalizeFirstLetter(deletedMission.name)}\` \`has been deleted.\``
        );

        return interaction.update({
          components: [successText],
          flags: MessageFlags.IsComponentsV2,
        });
      } catch (error) {
        return handleDeletionError(interaction, error, missionIdStr);
      }
    }

    const missionArray = await missions.find({ user_id: user._id }).toArray();
    if (missionArray.length === 0) {
      return interaction.reply({ content: "> `❌ No missions to delete.`", ephemeral: true });
    }

    const modal = getMissionActionModal(missionArray, MissionSelectOperations.DELETE);
    return interaction.showModal(modal);
  },
};

function handleDeletionError(interaction, error, missionId) {
  const messages = {
    NOT_FOUND: `> \`❌ No mission found with id ${missionId}.\``,
    FORBIDDEN: "> `❌ You don't have permission to delete this mission.`",
    SYSTEM_PROTECTED: "> `⚠️ You can't delete a system mission.`",
  };

  return interaction.reply({
    content: messages[error.message] || "> `❌ An unexpected error occurred.`",
    ephemeral: true,
  });
}
