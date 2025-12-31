import { ObjectId } from "mongodb";
import { getMissionListDisplay } from "../utils/formatter.js";
import { getMissionCard } from "../components/missionComponents.js";
import { MessageFlags } from "discord.js";

export default {
  prefix: "view_modal_submit",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");
    const selectedIds =
      interaction.fields.getStringSelectValues("view_select")?.map((id) => ObjectId.createFromHexString(id)) || [];

    const selectedMissions = await missions
      .find({
        user_id: user._id,
        _id: {
          $in: selectedIds,
        },
      })
      .toArray();

    for (const mission of selectedMissions) {
      const missionCard = await getMissionCard(mission);
      await interaction.followUp({
        components: [missionCard],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    return;
  },
};
