import { LabelBuilder, MessageFlags, ModalBuilder } from "discord.js";
import { getMissionCard, getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";
import { getMissionListDisplay } from "../utils/formatter.js";
import { ObjectId } from "mongodb";

export default {
  prefix: "lockin_modal_submit",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");

    const selectedIds =
      interaction.fields.getStringSelectValues("lockin_select")?.map((id) => ObjectId.createFromHexString(id)) || [];

    const selectedMissions = await missions
      .find({
        user_id: user._id,
        _id: { $in: selectedIds },
      })
      .toArray();

    await missions.updateOne({ _id: selectedMissions[0]._id }, { $set: { locked_in_at: new Date() } });
    const missionList = await getMissionListDisplay(interaction, db);
    await interaction.update({ missionList });
    const updatedMission = await missions.findOne({ _id: selectedMissions[0]._id });
    return interaction.followUp({
      components: [await getMissionCard(updatedMission)],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  },
};
