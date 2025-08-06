import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { getMissionSelector, MissionSelectOperations } from "../components/missionComponents.js";

export default {
  prefix: "view_",
  async execute(interaction, { db, user, value }) {
    const missions = db.collection("missions");

    const missionArray = await missions.find({ user_id: user._id }).toArray();
    const text = new TextDisplayBuilder().setContent("## `📇 Mission View`");
    const selector = getMissionSelector(missionArray, MissionSelectOperations.VIEW);

    return interaction.reply({
      components: [text, selector],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};
