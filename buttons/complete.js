import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { getMissionListDisplay } from "../utils/formatter.js";
import { getMissionCard, getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";
import { formatMissionRewardMessage } from "../utils/missionRewards.js";
import { getConfirmStatusRow } from "../components/buttonRows.js";
import { processMissionCompletion, sendDailyBonusFollowUp } from "../logic/missionLogic.js";
import { ObjectId } from "mongodb";

export default {
  prefix: "complete_",

  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      return interaction.reply({
        components: [getConfirmStatusRow(user)],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    const [missionIdStr, parent] = value.split("_");
    const missions = db.collection("missions");

    if (ObjectId.isValid(missionIdStr)) {
      const missionId = ObjectId.createFromHexString(missionIdStr);
      const mission = await missions.findOne({ _id: missionId, user_id: user._id, is_complete: { $ne: true } });

      if (!mission) {
        return interaction.reply({ content: "> `❌ Mission not found or already complete.`", ephemeral: true });
      }

      const result = await processMissionCompletion(db, user, mission);
      const { rewardData, totalTime, dailyBonus, completedAllDaily, updatedUser } = result;

      const updatePayload = await getCompletionUpdatePayload(parent, interaction, db, updatedUser, missionId);
      await interaction.update(updatePayload);

      const rewardMessage = formatMissionRewardMessage({
        ...rewardData,
        mission,
        user: updatedUser,
        totalTime,
        dailyBonus,
      });
      await interaction.followUp({
        components: [new TextDisplayBuilder().setContent(rewardMessage)],
        flags: MessageFlags.IsComponentsV2,
      });

      if (completedAllDaily && dailyBonus > 0) {
        await sendDailyBonusFollowUp(interaction);
      }
      return;
    }

    // DEFAULT: show selector
    const missionArray = await missions.find({ user_id: user._id, is_complete: { $ne: true } }).toArray();
    if (missionArray.length === 0) {
      return interaction.reply({ content: "> `❌ No incomplete missions found.`", ephemeral: true });
    }

    return interaction.reply({
      components: [
        new TextDisplayBuilder().setContent("## `🐾 Mission Complete`"),
        getMissionSelector(missionArray, MissionSelectOperations.COMPLETE),
      ],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  },
};

async function getCompletionUpdatePayload(parent, interaction, db, user, missionId) {
  if (parent === "status") {
    return await getMissionListDisplay(interaction, db);
  } else {
    const updatedMission = await db.collection("missions").findOne({ _id: missionId, user_id: user._id });
    const missionCard = await getMissionCard(updatedMission);
    return {
      components: [missionCard],
      flags: MessageFlags.IsComponentsV2,
    };
  }
}
