import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";
import { getStatusMessage } from "../utils/formatLabels.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { getMissionCard, getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";
import { calculateMissionRewards, formatMissionRewardMessage } from "../utils/missionRewards.js";
import { getConfirmStatusRow } from "../components/buttonRows.js";
import { ObjectId } from "mongodb";

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
    let missionId = values[0];
    const parent = values[1];

    if (ObjectId.isValid(missionId)) {
      missionId = ObjectId.createFromHexString(missionId);
      const mission = await missions.findOne({ _id: missionId, user_id: user._id, is_complete: { $ne: true } });
      const isDaily = mission.is_daily;
      if (!mission)
        return interaction.reply({ content: "> `❌ Mission not found or already complete.`", ephemeral: true });

      const totalTime = mission.locked_in_at
        ? calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken)
        : mission.time_taken || 0;

      const otherIncompleteDailies = await missions.countDocuments({
        user_id: user._id,
        is_daily: true,
        is_complete: false,
        _id: { $ne: mission._id },
      });

      const completedAllDaily = otherIncompleteDailies === 0;
      let dailyBonus = 0;

      if (completedAllDaily) {
        const alreadyRewarded = await missions.findOne({
          user_id: user._id,
          is_daily: true,
          rewarded_all_dailies: true,
        });

        if (!alreadyRewarded) {
          dailyBonus = 50;
        }
      }

      const rewardData = calculateMissionRewards({ mission, user, totalTime, dailyBonus });
      const updatedMission = {
        $set: {
          is_complete: true,
          locked_in_at: null,
          time_taken: totalTime,
          completed_at: getCurrentPST().toJSDate(),
          ppts_gained: rewardData.totalBonus,
          ...(completedAllDaily && { rewarded_all_dailies: true }),
        },
      };

      if (isDaily) {
        updatedMission.$inc = { xp: rewardData.totalBonus };
      }

      await missions.updateOne({ _id: mission._id }, updatedMission);
      await users.updateOne(
        { _id: user._id },
        {
          $set: { last_updated: getCurrentPST().toJSDate() },
          $inc: { ppts: rewardData.totalBonus, energy: -rewardData.cost },
        }
      );

      user = await users.findOne({ _id: user._id });
      const rewardMessage = formatMissionRewardMessage({ ...rewardData, mission, user, totalTime, dailyBonus });

      if (parent === "status") {
        const updatedStatus = await getStatusMessage(interaction.user, interaction, db);
        await interaction.update(updatedStatus);
      } else {
        const updatedMission = await missions.findOne({ _id: missionId, user_id: user._id });
        const missionCard = await getMissionCard(updatedMission);
        await interaction.update({
          components: [missionCard],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const text = new TextDisplayBuilder().setContent(rewardMessage);

      if (completedAllDaily && dailyBonus > 0) {
        await interaction.followUp({
          components: [text],
          flags: MessageFlags.IsComponentsV2,
        });

        const congratsMsgs = [
          "Woah!", // default
          "Harikitte ikou!",
          "How did you just do that.",
        ];

        const congratsMsg =
          Math.random() < 0.5
            ? congratsMsgs[0]
            : congratsMsgs[Math.floor(Math.random() * (congratsMsgs.length - 1)) + 1];

        const dailyBonusMsg = `\`${congratsMsg}\`
> \`✨ Completed all daily missions!\``;
        const dailyBonusText = new TextDisplayBuilder().setContent(dailyBonusMsg);
        return interaction.followUp({
          components: [dailyBonusText],
          flags: MessageFlags.IsComponentsV2,
        });
      }

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
