import { ButtonStyle, MessageFlags, SectionBuilder, TextDisplayBuilder } from "discord.js";
import { formatMission } from "../utils/formatLabels.js";
import { getMissionCard, getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";
import { getConfirmCheckOutRow, getConfirmStatusRow } from "../utils/buttonRows.js";
import { getCurrentPST } from "../utils/formatTime.js";

export default {
  prefix: "lockin_",
  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      const openStatus = getConfirmStatusRow(user);
      return interaction.reply({
        components: [openStatus],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }
    const missions = db.collection("missions");
    const values = value.split("_");
    const code = values[0];
    const parent = values[1];

    const alreadyLocked = await missions.findOne({
      user_id: user._id,
      locked_in_at: { $ne: null },
    });

    if (alreadyLocked) {
      const confirmCheckOut = getConfirmCheckOutRow(user, alreadyLocked);
      return interaction.reply({
        components: [confirmCheckOut],
        flags: MessageFlags.IsComponentsV2,
      });
    }
    if (/^\d{4}$/.test(code)) {
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
      if (mission) {
        await missions.updateOne({ code }, { $set: { locked_in_at: getCurrentPST().toJSDate() } });
        const text = new TextDisplayBuilder().setContent("`🔐 Locked in on:` " + formatMission(mission));
        const updatedMission = await missions.findOne({
          user_id: user._id,
          code,
        });
        const missionCard = await getMissionCard(updatedMission);
        await interaction.update({
          components: [missionCard],
          flags: MessageFlags.IsComponentsV2,
        });

        return interaction.followUp({
          components: [text],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    }

    const missionArray = await missions.find({ user_id: user._id, is_complete: { $ne: true } }).toArray();
    if (missionArray.length === 0) {
      return interaction.reply({
        content: "> `❌ No missions to lock in on.`",
        ephemeral: true,
      });
    }

    const text = new TextDisplayBuilder().setContent("## `🔐 Mission Lock In`");
    const selector = getMissionSelector(missionArray, MissionSelectOperations.LOCKIN);

    return interaction.reply({
      components: [text, selector],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};
