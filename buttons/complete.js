import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextDisplayBuilder } from "discord.js";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";
import { formatMission } from "../utils/formatLabels.js";
import { formatTime } from "../utils/formatTime.js";

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

    var bonus = 12 + Math.floor(Math.random() * 13);
    var cost = 10 + Math.floor(Math.random() * 11);
    if (user.energy - cost < 0) {
      cost = user.energy;
    }
    if (user.energy === 0) {
      cost = 0;
      bonus = 0;
    }
    const cheer = false; // TODO: /cheer
    const totalBonus = Math.floor(bonus * (totalTime > 300 ? 1.35 : 1));

    await users.updateOne(
      { _id: user._id },
      {
        $set: { last_updated: new Date() },
        $inc: { ppts: bonus, energy: -cost },
      }
    );

    const completeMissionMsg =
      totalTime === 0
        ? formatMission(mission) + " `🐾 Completed!`"
        : formatMission(mission) + " `🐾 Completed in ⏱️ " + formatTime(totalTime) + "!`";

    const bonusMessage =
      bonus > 0
        ? "\n" +
          `> -# \`Reward: ${bonus}\` ${totalTime > 300 ? "`🍵 Focused (x1.35)`" : ""} ${
            cheer ? "`👏 Cheer (x2)`" : ""
          }\n` +
          `> -# \`Energy: ${user.energy - cost}(-${cost})\` \`Ppts: ${user.ppts + bonus}(+${totalBonus})\``
        : "";

    const msg = completeMissionMsg + bonusMessage;

    // remove buttons
    await interaction.update({
      components: [interaction.message.components[0]],
      flags: MessageFlags.IsComponentsV2,
    });

    const text = new TextDisplayBuilder().setContent(msg);

    const missionsButton = new ButtonBuilder()
      .setCustomId(`missions_`)
      .setLabel("📖 Show Missions")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(missionsButton);

    return interaction.followUp({
      components: [text, row],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
