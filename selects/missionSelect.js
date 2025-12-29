import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { getMissionCard } from "../components/missionComponents.js";
import { getConfirmCheckOutRow } from "../components/buttonRows.js";
import { processMissionCompletion, sendDailyBonusFollowUp } from "../logic/missionLogic.js"; // Standardized logic
import { formatMissionRewardMessage } from "../utils/missionRewards.js";
import { ObjectId } from "mongodb";

export default {
  prefix: "missionSelect_",

  async execute(interaction, { db, user, value }) {
    const missions = db.collection("missions");
    const selectedIds = interaction.values?.map((id) => new ObjectId(id)) || [];

    const selectedMissions = await missions
      .find({
        user_id: user._id,
        _id: { $in: selectedIds },
      })
      .toArray();

    if (selectedMissions.length === 0) {
      return interaction.reply({ content: "❌ Mission not found!", ephemeral: true });
    }

    // LOCKIN
    if (value === "lockin") {
      const alreadyLocked = await missions.findOne({
        user_id: user._id,
        locked_in_at: { $ne: null },
      });

      if (alreadyLocked) {
        return interaction.reply({
          components: [getConfirmCheckOutRow(user, alreadyLocked)],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      await missions.updateOne({ _id: selectedMissions[0]._id }, { $set: { locked_in_at: new Date() } });
      const updatedMission = await missions.findOne({ _id: selectedMissions[0]._id });
      return interaction.update({
        components: [await getMissionCard(updatedMission)],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // COMPLETE
    if (value === "complete") {
      const rewardMessages = [];
      let lastResult = null;

      for (const mission of selectedMissions) {
        const result = await processMissionCompletion(db, user, mission);
        lastResult = result;

        const rewardMessage = formatMissionRewardMessage({
          ...result.rewardData,
          mission,
          user: result.updatedUser,
          totalTime: result.totalTime,
          dailyBonus: result.dailyBonus,
        });
        rewardMessages.push(rewardMessage);

        user = result.updatedUser;
      }

      await interaction.update({
        components: [new TextDisplayBuilder().setContent(rewardMessages.join("\n"))],
        flags: MessageFlags.IsComponentsV2,
      });

      if (lastResult?.completedAllDaily && lastResult?.dailyBonus > 0) {
        await sendDailyBonusFollowUp(interaction);
      }
      return;
    }

    // DELETE
    if (value === "delete") {
      await missions.deleteMany({ _id: { $in: selectedIds } });
      return interaction.update({
        components: [new TextDisplayBuilder().setContent(`\`💢 ${selectedIds.length} mission(s) deleted.\``)],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // VIEW
    if (value === "view") {
      const missionCard = await getMissionCard(selectedMissions[0]);
      return interaction.update({
        components: [missionCard],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
