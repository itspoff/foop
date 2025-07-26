import { ActionRowBuilder, ButtonBuilder, MessageFlags } from "discord.js";
import { formatHelpText, formatMission } from "../utils/formatLabels.js";

export default {
  prefix: "lockin_",
  async execute(interaction, { db, user, value }) {
    const missions = db.collection("missions");
    const code = value;

    const disabledRow = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(interaction.message.components[1].components[0]).setDisabled(true),
      ButtonBuilder.from(interaction.message.components[1].components[1]).setDisabled(true),
      ButtonBuilder.from(interaction.message.components[1].components[2]).setDisabled(true)
    );

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
        content: `\`💦\` \`no!! you can't lock in on a completed task...\` \n> ${formatMission(
          mission
        )} \`is already complete.\``,
        ephemeral: true,
      });

    const alreadyLocked = await missions.findOne({
      user_id: user._id,
      locked_in_at: { $ne: null },
      is_complete: false,
    });

    if (alreadyLocked) {
      await interaction.update({
        components: [interaction.message.components[0], disabledRow],
        flags: MessageFlags.IsComponentsV2,
      });
      return interaction.followUp({
        content: `\`⚠️ You are already locked in on:\` \`🔐\` ${formatMission(alreadyLocked)} ${formatHelpText(
          "use /mission checkout before locking in on a new mission."
        )}`,
        ephemeral: true,
      });
    }

    await missions.updateOne({ _id: mission._id }, { $set: { locked_in_at: new Date() }, $inc: { attempts: 1 } });
    const helpText = formatHelpText("use /mission checkout at any time to take a break.");

    await interaction.update({
      components: [interaction.message.components[0], disabledRow],
      flags: MessageFlags.IsComponentsV2,
    });

    return interaction.followUp({
      content: "`Locked in on:` `🔐` " + formatMission(mission) + helpText,
    });
  },
};
