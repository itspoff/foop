import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { getCurrentPST } from "../utils/formatTime.js";

export default {
  prefix: "profile_",

  async execute(interaction, { db, user }) {
    const newName = interaction.fields.getTextInputValue("profile_display_name");
    const newBubble = interaction.fields.getTextInputValue("profile_bubble");

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          display_name: newName,
          thought_bubble: newBubble,
          last_updated: getCurrentPST().toJSDate(),
        },
      }
    );

    const text = new TextDisplayBuilder().setContent("> `Profile updated.`");

    await interaction.reply({
      components: [text],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  },
};
