import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { capitalizeFirstLetter } from "../utils/formatLabels.js";
import { getConfirmStatusRow } from "../utils/buttonRows.js";
import { getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";
import { ObjectId } from "mongodb";

export default {
  prefix: "delete_",
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
    let missionId = values[0];
    const parent = values[1];

    if (ObjectId.isValid(missionId)) {
      missionId = ObjectId.createFromHexString(missionId);
      const mission = await missions.findOne({ _id: missionId });
      if (!mission) {
        return interaction.reply({
          content: `> \`❌ No mission found with id ${missionId}.\``,
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
      components: [text, selector],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};
