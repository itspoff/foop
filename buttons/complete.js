import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextDisplayBuilder } from "discord.js";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";
import { formatMission } from "../utils/formatLabels.js";
import { formatTime } from "../utils/formatTime.js";
import { getMissionButtonRow } from "../utils/buttonRows.js";

export default {
  prefix: "complete_",
  async execute(interaction, { db, user, value }) {
    const users = db.collection("users");
    const missions = db.collection("missions");
    const code = value;

    if (!/^\d{4}$/.test(code)) {
      return interaction.reply({
        content: "> `❌ Invalid 4-digit number code (e.g., 1234).`",
        ephemeral: true,
      });
    }

    const mission = await missions.findOne({ code, user_id: user._id });
    if (!mission) return interaction.reply({ content: "> `❌ Mission not found.`", ephemeral: true });

    if (mission.is_complete)
      return interaction.reply({
        content: `${formatMission(mission)} \` is already complete.\``,
        ephemeral: true,
      });

    var totalTime = 0;

    if (mission.locked_in_at) {
      totalTime = calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken);
    } else if (mission.time_taken) {
      totalTime = mission.time_taken;
    }

    await missions.updateOne(
      { _id: mission._id },
      {
        $set: { is_complete: true, locked_in_at: null, time_taken: totalTime },
      }
    );

    // check if this completes all daily missions

    const incompleteCount = await missions.countDocuments({
      user_id: user._id,
      is_daily: true,
      is_complete: { $ne: true },
    });

    const completedAllDaily = incompleteCount === 0;
    let dailyBonus = 0;
    console.log(completedAllDaily, incompleteCount);
    if (completedAllDaily) {
      // check if any daily mission was already rewarded
      const alreadyRewarded = await missions.findOne({
        user_id: user._id,
        is_daily: true,
        rewarded_all_dailies: true,
      });
      console.log(alreadyRewarded);
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

    // calculate user energy and ppts gain

    var bonus = 12 + Math.floor(Math.random() * 13);
    var cost = 10 + Math.floor(Math.random() * 11);
    if (user.energy - cost < 0) {
      cost = user.energy;
    }
    if (user.energy === 0) {
      cost = 0;
      bonus = 0;
    }
    const cheerCount = mission.cheers ? mission.cheers.length : 0;
    const totalBonus = Math.floor(bonus * (totalTime > 300 ? 1.35 : 1) * (cheerCount + 1) + dailyBonus);

    await users.updateOne(
      { _id: user._id },
      {
        $set: { last_updated: new Date() },
        $inc: { ppts: totalBonus, energy: -cost },
      }
    );

    const completeMissionMsg =
      totalTime === 0
        ? formatMission(mission) + " `🐾 Completed!`"
        : formatMission(mission) + " `🐾 Completed in ⏱️ " + formatTime(totalTime) + "!`";

    const bonusMessage =
      totalBonus > 0
        ? "\n" +
          `> -# \`Reward: ${bonus}\` ${totalTime > 300 ? "`🍵 Focused (x1.35)`" : ""} ${
            cheerCount > 0 ? `\`👏 Cheer (x${cheerCount + 1})\`` : ""
          } ${dailyBonus > 0 ? `\`🎯 All dailies complete! +${dailyBonus}\`` : ""} \n` +
          `> -# \`Energy: ${user.energy - cost}(-${cost})\` \`Ppts: ${user.ppts + totalBonus}(+${totalBonus})\``
        : "";

    const msg = completeMissionMsg + bonusMessage;

    // remove buttons
    await interaction.update({
      components: [interaction.message.components[0]],
      flags: MessageFlags.IsComponentsV2,
    });

    const text = new TextDisplayBuilder().setContent(msg);
    const row = getMissionButtonRow(code, { disableLockIn: true, disableComplete: true });

    return interaction.followUp({
      components: [text, row],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
