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
    const parent = values[1];

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

    if (parent === "confirm") {
      await users.updateOne({ _id: user._id }, { $inc: { ppts: -25 } });
      await missions.updateOne({ code }, { $addToSet: { cheers: user._id } });

      const text = new TextDisplayBuilder().setContent(
        `\`LET'S GOOOOOOOO!!! 💢💢💢\`
> \`${user.display_name} cheered for\` ${formatMission(mission)}`
      );

      return interaction.update({
        components: [text],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // Default: confirm menu pop up
    const confirmCheerRow = getConfirmCheerRow(user, code);

    await interaction.reply({
      components: [confirmCheerRow],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
