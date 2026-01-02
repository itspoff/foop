import { getStatusPayload } from "../utils/formatter.js";

export default {
  prefix: "status_",
  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      return interaction.reply({
        components: [new TextDisplayBuilder().setContent("> `🥀 This isn't your button.`")],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    const status = await getStatusPayload(interaction, db);
    return interaction.reply(status);
  },
};
