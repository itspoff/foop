import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { formatMission } from "../utils/formatLabels.js";
import { getMissionCard } from "../components/missionComponents.js";
import { calculateMissionRewards, formatMissionRewardMessage } from "../utils/missionRewards.js";

export default {
  prefix: "missionSelect_",

  async execute(interaction, { db, user, value }) {
    const users = db.collection("users");
    const selectedCodes = interaction.values;
    const missionsCollection = db.collection("missions");

    // Fetch selected missions
    const selectedMissions = await missionsCollection
      .find({ user_id: user._id, code: { $in: selectedCodes } })
      .toArray();

    if (selectedMissions.length === 0) {
      return interaction.reply({
        content: "❌ Couldn't find any selected missions.",
        ephemeral: true,
      });
    }

    let resultMessage = "";

    if (value === "lockin") {
      await Promise.all(
        selectedMissions.map((mission) =>
          missionsCollection.updateOne({ _id: mission._id }, { $set: { locked_in_at: new Date() } })
        )
      );
      resultMessage = "`🔐 Locked in on:` " + formatMission(selectedMissions[0]);
    } else if (value === "complete") {
      const now = new Date();
      const rewardMessages = [];

      for (const mission of selectedMissions) {
        await missionsCollection.updateOne(
          { _id: mission._id },
          {
            $set: {
              is_complete: true,
              locked_in_at: null,
              completed_at: now,
            },
          }
        );

        const totalTime = mission.locked_in_at ? Math.round((now - new Date(mission.locked_in_at)) / 1000) : 0;

        const dailyBonus = true;
        const rewardData = calculateMissionRewards({ mission, user, totalTime, dailyBonus });

        await users.updateOne(
          { _id: user._id },
          {
            $set: { last_updated: new Date() },
            $inc: { ppts: rewardData.totalBonus, energy: -rewardData.cost },
          }
        );
        user = await users.findOne({ _id: user._id });
        const rewardMessage = formatMissionRewardMessage({ ...rewardData, mission, user });
        rewardMessages.push(rewardMessage);
      }

      resultMessage = rewardMessages.join("\n");
    } else if (value === "delete") {
      const results = await Promise.all(
        selectedMissions.map((mission) => missionsCollection.deleteOne({ _id: mission._id }))
      );
      const deletedCount = results.reduce((sum, res) => sum + res.deletedCount, 0);
      resultMessage = `\`💢 ${deletedCount} mission(s) deleted:\``;
    } else if (value === "view") {
      const mission = selectedMissions[0];
      const missionCard = getMissionCard(mission);
      return interaction.reply({
        components: [missionCard],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      resultMessage = "> `⚠️ No valid action provided.`";
    }

    const text = new TextDisplayBuilder().setContent(resultMessage);

    return interaction.reply({
      components: [text],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
