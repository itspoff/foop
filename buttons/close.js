import { MessageFlags } from "discord.js";

export default {
  prefix: "close_",

  async execute(interaction, { db, user }) {
    await interaction.update({
      components: [interaction.message.components[0]],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
