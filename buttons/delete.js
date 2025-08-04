import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextDisplayBuilder } from "discord.js";
import { capitalizeFirstLetter } from "../utils/formatLabels.js";
import { getMissionButtonRow } from "../utils/buttonRows.js";

export default {
  prefix: "delete_",
  async execute(interaction, { db, user, value }) {
    const missions = db.collection("missions");
    const code = value;

    if (!/^\d{4}$/.test(code)) {
      return interaction.reply({
        content: "> `❌ Use a valid 4-digit number code (e.g., 1234).`",
        ephemeral: true,
      });
    }

    const mission = await missions.findOne({ code });

    if (!mission) {
      return interaction.reply({
        content: `> \`❌ No mission found with code ${code}.\``,
        ephemeral: true,
      });
    }
    if (mission.user_id !== user._id) {
      return interaction.reply({
        content: "> `❌ You don't have permission to delete this mission.`",
        ephemeral: true,
      });
    }
    if (mission.is_system) {
      return interaction.reply({
        content: "> `⚠️ You can't delete a system mission.`",
        ephemeral: true,
      });
    }

    await missions.deleteOne({ _id: mission._id });

    // remove button from prev msg
    await interaction.update({
      components: [interaction.message.components[0]],
      flags: MessageFlags.IsComponentsV2,
    });

    const text = new TextDisplayBuilder().setContent(
      `\`Mission\` \`🗑️\` \`${capitalizeFirstLetter(mission.name)}\` \`has been deleted.\``
    );

    const row = getMissionButtonRow(code, {
      disableLockIn: true,
      disableComplete: true,
      disableDelete: true,
      disableCheer: true,
    });

    return interaction.followUp({
      components: [text, row],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
