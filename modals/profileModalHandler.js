import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { getStatusMessage } from "../utils/formatLabels.js";

export default {
  prefix: "profile_",

  async execute(interaction, { db, user, value }) {
    const newName = interaction.fields.getTextInputValue("profile_display_name");
    const newBubble = interaction.fields.getTextInputValue("profile_bubble");
    const newResetHour = parseInt(interaction.fields.getTextInputValue("profile_reset_hour"));
    const buttonOwnerId = value;

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          display_name: newName,
          thought_bubble: newBubble,
          last_updated: getCurrentPST().toJSDate(),
          daily_reset_hour: newResetHour,
        },
      }
    );

    if (buttonOwnerId === user._id) {
      const editedStatus = await getStatusMessage(interaction, db);
      await interaction.update(editedStatus);
    } else {
      const text = new TextDisplayBuilder().setContent(`> \`Profile updated for ${user.display_name}.\``);
      await interaction.reply({
        components: [text],
        flags: [MessageFlags.IsComponentsV2],
      });
    }
  },
};
