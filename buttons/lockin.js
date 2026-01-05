import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { formatMission } from "../utils/formatter.js";
import { getMissionActionModal, getMissionCard, MissionSelectOperations } from "../components/missionComponents.js";
import { getConfirmCheckOutRow } from "../components/buttonRows.js";
import { processMissionLockIn } from "../logic/missionLogic.js";
import { ObjectId } from "mongodb";

export default {
  prefix: "lockin_",
  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      return interaction.reply({
        components: [new TextDisplayBuilder().setContent("> `🥀 This isn't your button.`")],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    const [missionIdStr] = value.split("_");
    const missions = db.collection("missions");

    if (ObjectId.isValid(missionIdStr)) {
      const missionId = ObjectId.createFromHexString(missionIdStr);

      try {
        const result = await processMissionLockIn(db, user, missionId);

        if (result.status === "ALREADY_LOCKED") {
          return interaction.reply({
            components: [getConfirmCheckOutRow(user, result.mission)],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        const missionCard = await getMissionCard(result.mission);
        const lockText = new TextDisplayBuilder().setContent(`> \`🔐 Locked in on:\` ${formatMission(result.mission)}`);

        await interaction.update({
          components: [missionCard],
          flags: MessageFlags.IsComponentsV2,
        });

        return interaction.followUp({
          components: [lockText],
          flags: MessageFlags.IsComponentsV2,
        });
      } catch (error) {
        return handleLockInError(interaction, error, missionIdStr);
      }
    }

    // DEFAULT: show modal
    const missionArray = await missions.find({ user_id: user._id, is_complete: { $ne: true } }).toArray();
    if (missionArray.length === 0) {
      return interaction.reply({ content: "> `❌ No missions to lock in on.`", ephemeral: true });
    }

    const modal = getMissionActionModal(missionArray, MissionSelectOperations.LOCKIN);
    return interaction.showModal(modal);
  },
};

function handleLockInError(interaction, error, missionId) {
  const content =
    error.message === "FORBIDDEN"
      ? "> `❌ You don't have permission to modify this mission.`"
      : `> \`❌ No mission found with id ${missionId}.\``;

  return interaction.reply({ content, ephemeral: true });
}
