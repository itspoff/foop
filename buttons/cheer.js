import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextDisplayBuilder } from "discord.js";
import { getConfirmCheerRow, getStatusButtonRow } from "../utils/buttonRows.js";
import { getExistingUserFromId } from "../utils/getOrCreateUser.js";
import { formatMission } from "../utils/formatLabels.js";

export default {
  prefix: "cheer_",
  async execute(interaction, { db, user, value }) {
    const missions = db.collection("missions");
    const users = db.collection("users");

    const values = value.split("_");
    const code = values[0];
    const userId = values[1];

    const targetUser = await getExistingUserFromId(userId);
    if (!targetUser) {
      return interaction.reply({
        content: "> `❌ Target user does not exist`",
        ephemeral: true,
      });
    }

    const mission = await missions.findOne({
      code,
      locked_in_at: { $ne: null },
    });

    if (!mission) {
      return interaction.reply({
        content: "> `❌ Mission not found or not locked in.`",
        ephemeral: true,
      });
    }

    // Handle confirmation
    if (value.endsWith("confirm")) {
      if (user.ppts < 250) {
        return interaction.reply({
          content: "> `❌ You don't have enough points to cheer!`",
          ephemeral: true,
        });
      }

      const alreadyCheered = mission.cheers?.includes(user._id);
      if (alreadyCheered) {
        return interaction.reply({
          content: "> `❌ You already cheered for this mission.`",
          ephemeral: true,
        });
      }

      await users.updateOne({ _id: user._id }, { $inc: { ppts: -250 } });
      await missions.updateOne({ code }, { $addToSet: { cheers: user._id } });

      const text = new TextDisplayBuilder().setContent(`> \`Cheered for\` ${formatMission(mission)}`);

      const statusButtonRow = getStatusButtonRow(user, false, mission, {
        disableCheer: true,
      });

      await interaction.update({
        components: [interaction.message.components[0], statusButtonRow],
        flags: MessageFlags.IsComponentsV2,
      });

      return interaction.followUp({
        components: [text],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
      });
    }

    // Default: confirm menu pop up
    const confirmCheerRow = getConfirmCheerRow(user, code, userId);

    await interaction.update({
      components: [interaction.message.components[0], confirmCheerRow],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
