import { ButtonStyle, MessageFlags, SectionBuilder, TextDisplayBuilder } from "discord.js";
import { getMissionCard } from "../components/missionComponents.js";
import { calculateMissionRewards, formatMissionRewardMessage } from "../utils/missionRewards.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";
import { getConfirmCheckOutRow } from "../components/buttonRows.js";
import { ObjectId } from "mongodb";

export default {
  prefix: "missionSelect_",

  async execute(interaction, { db, user, value }) {
    const users = db.collection("users");
    const selectedMissionIds = interaction.values.map((id) => new ObjectId(id));
    const missions = db.collection("missions");

    const selectedMissions = await missions.find({ user_id: user._id, _id: { $in: selectedMissionIds } }).toArray();
    if (selectedMissions.length === 0) {
      await interaction.reply({
        content: "❌ This selector is outdated!",
        ephemeral: true,
      });
      return interaction.deleteReply();
    }

    let resultMessage = "";

    if (value === "lockin") {
      const alreadyLocked = await missions.findOne({
        user_id: user._id,
        locked_in_at: { $ne: null },
      });

      if (alreadyLocked) {
        const confirmCheckOut = getConfirmCheckOutRow(user, alreadyLocked);
        return interaction.reply({
          components: [confirmCheckOut],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      await missions.updateOne({ _id: selectedMissions[0]._id }, { $set: { locked_in_at: new Date() } });

      const updatedMission = await missions.findOne({ _id: selectedMissions[0]._id, locked_in_at: { $ne: null } });
      const missionCard = await getMissionCard(updatedMission);
      return interaction.update({
        components: [missionCard],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (value === "complete") {
      const rewardMessages = [];
      let completedAllDaily = false;
      let dailyBonus = 0;

      for (const mission of selectedMissions) {
        const totalTime = mission.locked_in_at
          ? calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken)
          : mission.time_taken || 0;

        const incompleteCount = await missions.countDocuments({
          user_id: user._id,
          is_daily: true,
          is_complete: { $ne: true },
        });

        completedAllDaily = incompleteCount === 1;

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
        rewardMessages.push(rewardMessage);
      }
      resultMessage = rewardMessages.join("\n");
      const text = new TextDisplayBuilder().setContent(resultMessage);

      if (completedAllDaily && dailyBonus > 0) {
        await interaction.update({
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

      return interaction.update({
        components: [text],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (value === "delete") {
      const results = await Promise.all(selectedMissions.map((mission) => missions.deleteOne({ _id: mission._id })));
      const deletedCount = results.reduce((sum, res) => sum + res.deletedCount, 0);
      resultMessage = `\`💢 ${deletedCount} mission(s) deleted:\``;
      const text = new TextDisplayBuilder().setContent(resultMessage);

      return interaction.update({
        components: [text],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (value === "view") {
      const mission = selectedMissions[0];
      const missionCard = await getMissionCard(mission);
      return interaction.update({
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
