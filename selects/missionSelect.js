import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { formatMission } from "../utils/formatLabels.js";

export default {
  prefix: "missionSelect_",

  async execute(interaction, { db, user, value }) {
    const selectedCodes = interaction.values;
    const missionsCollection = db.collection("missions");

    // Fetch selected missions
    const selectedMissions = await missionsCollection
      .find({ user_id: user._id, code: { $in: selectedCodes } })
      .toArray();

    if (selectedMissions.length === 0) {
      return interaction.reply({
        content: "❌ Couldn't find any selected missions.",
        ephemeral: true,
      });
    }

    let resultMessage = "";

    if (value === "lockin") {
      const results = await Promise.all(
        selectedMissions.map((mission) =>
          missionsCollection.updateOne({ _id: mission._id }, { $set: { locked_in_at: new Date() } })
        )
      );
      resultMessage = "`🔐 Locked in on:`";
    } else if (value === "complete") {
      const results = await Promise.all(
        selectedMissions.map((mission) =>
          missionsCollection.updateOne(
            { _id: mission._id },
            {
              $set: {
                is_complete: true,
                completed_at: new Date(),
              },
            }
          )
        )
      );
      const modifiedCount = results.reduce((sum, res) => sum + res.modifiedCount, 0);
      resultMessage = `\`🐾 ${modifiedCount} mission(s) completed:\``;
    } else if (value === "delete") {
      const results = await Promise.all(
        selectedMissions.map((mission) => missionsCollection.deleteOne({ _id: mission._id }))
      );
      const deletedCount = results.reduce((sum, res) => sum + res.deletedCount, 0);
      resultMessage = `\`🗑️ ${deletedCount} mission(s) deleted:\``;
    } else {
      resultMessage = "> `⚠️ No valid action provided.`";
    }

    const missionList = selectedMissions.map((m) => `${formatMission(m)}`).join(", ");
    const text = new TextDisplayBuilder().setContent(resultMessage + " " + missionList);

    await interaction.deferReply();
    await interaction.message.delete();

    return interaction.followUp({
      components: [text],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
