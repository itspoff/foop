import { ActionRowBuilder, ButtonBuilder, MessageFlags } from "discord.js";
import { capitalizeFirstLetter } from "../utils/formatLabels.js";

export default {
  prefix: "delete_",
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
    if (mission.is_system) {
      return interaction.reply({
        content: "> `⚠️ You can't delete a system mission.`",
        ephemeral: true,
      });
    }
    if (mission.user_id !== user._id) {
      return interaction.reply({
        content: "> `❌ You don't have permission to delete this mission.`",
        ephemeral: true,
      });
    }

    await missions.deleteOne({ _id: mission._id });
    await interaction.update({
      components: [interaction.message.components[0], disabledRow],
      flags: MessageFlags.IsComponentsV2,
    });

    return interaction.followUp({
      content: `\`Mission\` \`🗑️\` \`${capitalizeFirstLetter(mission.name)}\` \`has been deleted.\``,
    });
  },
};
