import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextDisplayBuilder } from "discord.js";
import { getConfirmCheerRow, getStatusButtonRow } from "../utils/buttonRows.js";
import { getExistingUserFromId } from "../utils/getOrCreateUser.js";
import { formatMission } from "../utils/formatLabels.js";
import { ObjectId } from "mongodb";

export default {
  prefix: "cheer_",
  async execute(interaction, { db, user, value }) {
    const missions = db.collection("missions");
    const users = db.collection("users");

    const values = value.split("_");
    let missionId = values[0];
    const parent = values[1];

    if (ObjectId.isValid(missionId)) {
      missionId = ObjectId.createFromHexString(missionId);
      const mission = await missions.findOne({
        _id: missionId,
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
        await missions.updateOne({ _id: missionId }, { $addToSet: { cheers: user._id } });

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
      const confirmCheerRow = getConfirmCheerRow(user, missionId);

      // store message id of the mission card? and update the card

      await interaction.reply({
        components: [confirmCheerRow],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
