import { MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { getMissionListDisplay } from "../utils/formatter.js";

export function getMissionTabSelector(user, options = {}) {
  const userId = user._id;
  const select = new StringSelectMenuBuilder().setCustomId(`missionTabSelect_${userId}`).addOptions(
    new StringSelectMenuOptionBuilder()
      .setLabel("All Missions")
      .setValue("all")
      .setDefault(options == MissionTabOptions.ALL),
    new StringSelectMenuOptionBuilder()
      .setLabel("Today's Missions")
      .setValue("today")
      .setDefault(options == MissionTabOptions.TODAY)
  );

  return select;
}
export const MissionTabOptions = {
  ALL: {
    selected_tab: 0,
    value: "all",
  },
  TODAY: {
    selected_tab: 1,
    value: "today",
  },
};

export default {
  prefix: "missionTabSelect_",

  async execute(interaction, { db, user, value }) {
    const missions = db.collection("missions");
    if (!value.endsWith(user._id)) {
      return await interaction.reply({
        content: "> `❌ This isn't yours, meow. (Do /missions to open your mission list.)`",
        flags: MessageFlags.Ephemeral,
      });
    }

    const selectedTab =
      Object.values(MissionTabOptions).find((opt) => interaction.values.includes(opt.value)) || MissionTabOptions.ALL;

    const message = await getMissionListDisplay(interaction, db, selectedTab);

    return await interaction.update(message);
  },
};
