import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { formatMission } from "../utils/formatLabels.js";
import { getMissionCard } from "../components/missionComponents.js";
import { calculateMissionRewards, formatMissionRewardMessage } from "../utils/missionRewards.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";

export default {
  prefix: "missionSelect_",

  async execute(interaction, { db, user, value }) {
    const users = db.collection("users");
    const selectedCodes = interaction.values;
    const missions = db.collection("missions");

    // Fetch selected missions
    const selectedMissions = await missions.find({ user_id: user._id, code: { $in: selectedCodes } }).toArray();

    if (selectedMissions.length === 0) {
      return interaction.reply({
        content: "❌ Couldn't find any selected missions.",
        ephemeral: true,
      });
    }

    let resultMessage = "";

    if (value === "lockin") {
      const alreadyLocked = await missions.findOne({
        user_id: user._id,
        locked_in_at: { $ne: null },
      });

      if (alreadyLocked) {
        return interaction.reply({
          content: `\`⚠️ You are already locked in on:\` \`🔐\` ${formatMission(alreadyLocked)}`,
          ephemeral: true,
          // TODO: add checkout
        });
      }
      await missions.updateOne({ _id: selectedMissions[0]._id }, { $set: { locked_in_at: new Date() } });
      const updatedMission = await missions.findOne({ _id: selectedMissions[0]._id, locked_in_at: { $ne: null } });
      const missionCard = await getMissionCard(updatedMission);
      return interaction.reply({
        components: [missionCard],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (value === "complete") {
      const rewardMessages = [];

      for (const mission of selectedMissions) {
        const totalTime = mission.locked_in_at
          ? calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken)
          : mission.time_taken || 0;

        await missions.updateOne(
          { _id: mission._id },
          {
            $set: {
              is_complete: true,
              locked_in_at: null,
              time_taken: totalTime,
              completed_at: getCurrentPST().toJSDate(),
            },
          }
        );

        const incompleteCount = await missions.countDocuments({
          user_id: user._id,
          is_daily: true,
          is_complete: { $ne: true },
        });

        const completedAllDaily = incompleteCount === 0;
        let dailyBonus = 0;

        if (completedAllDaily) {
          const alreadyRewarded = await missions.findOne({
            user_id: user._id,
            is_daily: true,
            rewarded_all_dailies: true,
          });

          if (!alreadyRewarded) {
            dailyBonus = 50;
            await missions.updateOne({ _id: mission._id }, { $set: { rewarded_all_dailies: true } });
          }
        }

        const rewardData = calculateMissionRewards({ mission, user, totalTime, dailyBonus });

        await users.updateOne(
          { _id: user._id },
          {
            $set: { last_updated: new Date() },
            $inc: { ppts: rewardData.totalBonus, energy: -rewardData.cost },
          }
        );
        user = await users.findOne({ _id: user._id });
        const rewardMessage = formatMissionRewardMessage({ ...rewardData, totalTime, mission, user });
        rewardMessages.push(rewardMessage);
      }
      resultMessage = rewardMessages.join("\n");
    } else if (value === "delete") {
      const results = await Promise.all(selectedMissions.map((mission) => missions.deleteOne({ _id: mission._id })));
      const deletedCount = results.reduce((sum, res) => sum + res.deletedCount, 0);
      resultMessage = `\`💢 ${deletedCount} mission(s) deleted:\``;
    } else if (value === "view") {
      const mission = selectedMissions[0];
      const missionCard = await getMissionCard(mission);
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
