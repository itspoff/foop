import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextDisplayBuilder } from "discord.js";
import { formatHelpText, formatMission } from "../utils/formatLabels.js";

export default {
  prefix: "lockin_",
  async execute(interaction, { db, user, value }) {
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
      return interaction.reply({
        content: `\`⚠️ You are already locked in on:\` \`🔐\` ${formatMission(alreadyLocked)} ${formatHelpText(
          "use /mission checkout before locking in on a new mission."
        )}`,
        ephemeral: true,
      });
    }

    await missions.updateOne({ _id: mission._id }, { $set: { locked_in_at: new Date() }, $inc: { attempts: 1 } });
    // const helpText = formatHelpText("use /mission checkout at any time to take a break.");

    await interaction.update({
      components: [interaction.message.components[0]],
      flags: MessageFlags.IsComponentsV2,
    });

    const text = new TextDisplayBuilder().setContent("`Locked in on:` `🔐` " + formatMission(mission));

    const checkOutButton = new ButtonBuilder()
      .setCustomId(`checkout_${code}`)
      .setLabel("💨 Check Out")
      .setStyle(ButtonStyle.Secondary);

    const completeButton = new ButtonBuilder()
      .setCustomId(`complete_${code}`)
      .setLabel("🐾 Complete")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(checkOutButton, completeButton);

    return interaction.followUp({
      components: [text, row],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
