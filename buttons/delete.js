import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextDisplayBuilder } from "discord.js";
import { capitalizeFirstLetter } from "../utils/formatLabels.js";
import { getMissionButtonRow } from "../utils/buttonRows.js";
import { getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";

export default {
  prefix: "delete_",
  async execute(interaction, { db, user, value }) {
    const missions = db.collection("missions");
    const code = value;

    if (code) {
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
      const text = new TextDisplayBuilder().setContent(
        `\`Mission\` \`💢\` \`${capitalizeFirstLetter(mission.name)}\` \`has been deleted.\``
      );
      return interaction.update({
        components: [text],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const missionArray = await missions.find({ user_id: user._id }).toArray();
    const text = new TextDisplayBuilder().setContent("## `💢 Mission Delete`");
    const selector = getMissionSelector(missionArray, MissionSelectOperations.DELETE);

    return interaction.reply({
      components: [selector],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  },
};
