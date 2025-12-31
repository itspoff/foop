import { ObjectId } from "mongodb";
import { capitalizeFirstLetter, getMissionListDisplay } from "../utils/formatter.js";
import { MessageFlags, TextDisplayBuilder } from "discord.js";

export default {
  prefix: "delete_modal_submit",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");
    const selectedIds =
      interaction.fields.getStringSelectValues("delete_select")?.map((id) => ObjectId.createFromHexString(id)) || [];

    const selectedMissions = await missions
      .find({
        user_id: user._id,
        _id: {
          $in: selectedIds,
        },
      })
      .toArray();

    const rewardMessages = [];

    for (const mission of selectedMissions) {
      const message = `\`Mission\` \`💢\` \`${capitalizeFirstLetter(mission.name)}\` \`has been deleted.\``;

      rewardMessages.push(message);
    }

    await missions.deleteMany({ _id: { $in: selectedIds } });

    const missionDisplay = await getMissionListDisplay(interaction, db);
    await interaction.update(missionDisplay);

    await interaction.followUp({
      components: [new TextDisplayBuilder().setContent(rewardMessages.join("\n"))],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });

    await interaction.followUp({
      components: [new TextDisplayBuilder().setContent(`> \`💢 ${selectedIds.length} mission(s) deleted.\``)],
      flags: MessageFlags.IsComponentsV2,
    });

    return;
  },
};
