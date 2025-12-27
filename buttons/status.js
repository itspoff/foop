import { getStatusHeader } from "../utils/formatLabels.js";
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

    const status = await getStatusHeader(interaction, db);
    return interaction.reply(status);
  },
};
