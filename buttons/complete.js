import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";
import { formatMission, getStatusMessage } from "../utils/formatLabels.js";
import { formatTime, getCurrentPST } from "../utils/formatTime.js";
import { getMissionCard, getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";
import { calculateMissionRewards, formatMissionRewardMessage } from "../utils/missionRewards.js";
import { getConfirmStatusRow } from "../utils/buttonRows.js";

export default {
  prefix: "complete_",

  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      const openStatus = getConfirmStatusRow(user);
      return interaction.reply({
        components: [openStatus],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }
    const users = db.collection("users");
    const missions = db.collection("missions");
    const values = value.split("_");
    const code = values[0];
    const parent = values[1];

    if (/^\d{4}$/.test(code)) {
      const mission = await missions.findOne({ code, user_id: user._id, is_complete: { $ne: true } });
      if (!mission)
        return interaction.reply({ content: "> `❌ Mission not found or already complete.`", ephemeral: true });

      const totalTime = mission.locked_in_at
        ? calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken)
        : mission.time_taken || 0;

      const incompleteCount = await missions.countDocuments({
        user_id: user._id,
        is_daily: true,
        is_complete: { $ne: true },
      });

      const completedAllDaily = incompleteCount === 1;
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
      await missions.updateOne(
        { _id: mission._id },
        {
          $set: {
            is_complete: true,
            locked_in_at: null,
            time_taken: totalTime,
            completed_at: getCurrentPST().toJSDate(),
            ppts_gained: rewardData.totalBonus,
          },
        }
      );
      await users.updateOne(
        { _id: user._id },
        {
          $set: { last_updated: getCurrentPST().toJSDate() },
          $inc: { ppts: rewardData.totalBonus, energy: -rewardData.cost },
        }
      );

      user = await users.findOne({ _id: user._id });
      const rewardMessage = formatMissionRewardMessage({ ...rewardData, totalTime, mission, user });

      if (parent === "status") {
        const updatedStatus = await getStatusMessage(interaction.user, interaction, db);
        await interaction.update(updatedStatus);
      } else {
        const updatedMission = await missions.findOne({ user_id: user._id, code });
        const missionCard = await getMissionCard(updatedMission);
        await interaction.update({
          components: [missionCard],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const text = new TextDisplayBuilder().setContent(rewardMessage);
      return interaction.followUp({
        components: [text],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const missionArray = await missions.find({ user_id: user._id, is_complete: { $ne: true } }).toArray();
    if (missionArray.length === 0) {
      return interaction.reply({
        content: "> `❌ No incomplete missions found.`",
        ephemeral: true,
      });
    }

    const text = new TextDisplayBuilder().setContent("## `🐾 Mission Complete`");
    const selector = getMissionSelector(missionArray, MissionSelectOperations.COMPLETE);

    return interaction.reply({
      components: [text, selector],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};
