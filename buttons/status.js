import { getStatusPayload } from "../utils/formatter.js";
import { getConfirmStatusRow } from "../components/buttonRows.js";

export default {
  prefix: "status_",
  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      const openStatus = getConfirmStatusRow(user);
      return interaction.reply({
        components: [openStatus],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    const status = await getStatusPayload(interaction, db);
    return interaction.reply(status);
  },
};
