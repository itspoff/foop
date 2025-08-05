import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextDisplayBuilder } from "discord.js";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";
import { formatMission } from "../utils/formatLabels.js";
import { formatTime } from "../utils/formatTime.js";
import { getMissionCard, getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";

export default {
  prefix: "complete_",

  async execute(interaction, { db, user, value }) {
    const users = db.collection("users");
    const missions = db.collection("missions");
    const code = value;

    if (code) {
      if (!/^\d{4}$/.test(code)) {
        return interaction.reply({
          content: "> `❌ Invalid 4-digit number code (e.g., 1234).`",
          ephemeral: true,
        });
      }

      const mission = await missions.findOne({ code, user_id: user._id });
      if (!mission) return interaction.reply({ content: "> `❌ Mission not found.`", ephemeral: true });

      if (mission.is_complete) {
        return interaction.reply({
          content: `${formatMission(mission)} \`is already complete.\``,
          ephemeral: true,
        });
      }

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
          await users.updateOne(
            { _id: user._id },
            {
              $set: { last_updated: new Date() },
              $inc: { ppts: dailyBonus },
            }
          );

          await missions.updateOne({ _id: mission._id }, { $set: { rewarded_all_dailies: true } });
        }
      }

      let bonus = 12 + Math.floor(Math.random() * 13); // 12–24
      let cost = 10 + Math.floor(Math.random() * 11); // 10–20

      if (user.energy - cost < 0) cost = user.energy;
      if (user.energy === 0) {
        cost = 0;
        bonus = 0;
      }

      const cheerCount = mission.cheers?.length || 0;
      const focusedMultiplier = totalTime > 300 ? 1.35 : 1;
      const totalBonus = Math.floor(bonus * focusedMultiplier * (cheerCount + 1) + dailyBonus);

      await users.updateOne(
        { _id: user._id },
        {
          $set: { last_updated: new Date() },
          $inc: { ppts: totalBonus, energy: -cost },
        }
      );

      const completeMessage = totalTime
        ? `${formatMission(mission)} \`🐾 Completed in ⏱️ ${formatTime(totalTime)}!\``
        : `${formatMission(mission)} \`🐾 Completed!\``;

      const rewardLines = [
        `> -# \`Reward: ${bonus}\``,
        totalTime > 300 ? "`🍵 Focused (x1.35)`" : "",
        cheerCount > 0 ? `\`👏 Cheer (x${cheerCount + 1})\`` : "",
        dailyBonus > 0 ? `\`🎯 All dailies complete! +${dailyBonus}\`` : "",
        `> -# \`Energy: ${user.energy - cost}(-${cost})\` \`Ppts: ${user.ppts + totalBonus}(+${totalBonus})\``,
      ]
        .filter(Boolean)
        .join(" ");

      const text = new TextDisplayBuilder().setContent(`${completeMessage}\n${rewardLines}`);

      const updatedMission = await missions.findOne({ user_id: user._id, code });
      const missionCard = getMissionCard(updatedMission);

      await interaction.update({
        components: [missionCard],
        flags: MessageFlags.IsComponentsV2,
      });

      return interaction.followUp({
        components: [text],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const missionArray = await missions.find({ user_id: user._id, is_complete: { $ne: true } }).toArray();
    if (missionArray.length === 0) {
      return interaction.reply({
        content: "> `❌ No imcomplete missions found.`",
        ephemeral: true,
      });
    }

    const text = new TextDisplayBuilder().setContent("## `🐾 Mission Complete`");
    const selector = getMissionSelector(missionArray, MissionSelectOperations.COMPLETE);

    return interaction.reply({
      components: [text, selector],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  },
};
