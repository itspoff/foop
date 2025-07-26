import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";
import { formatMission } from "../utils/formatLabels.js";
import { formatTime } from "../utils/formatTime.js";

export default {
  prefix: "checkout_",
  async execute(interaction, { db, user, value }) {
    const missions = db.collection("missions");
    const code = value;

    const mission = await missions.findOne({
      user_id: user._id,
      locked_in_at: { $ne: null },
      is_complete: { $ne: true },
    });

    const msg = new TextDisplayBuilder().setContent("`🗨️` `can you lock the fuck in`\n> `Lock in on a mission first.`");
    const thumbnail = new ThumbnailBuilder().setDescription("poff").setURL("attachment://poff-icon.png");
    const lockInMessage = new SectionBuilder().addTextDisplayComponents(msg).setThumbnailAccessory(thumbnail);

    if (!mission) {
      const file = new AttachmentBuilder("assets/poff-icon.png", { name: "poff-icon.png" });
      return interaction.reply({
        components: [lockInMessage],
        flags: MessageFlags.IsComponentsV2,
        files: [file],
        ephemeral: true,
      });
    }

    const totalTime = calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken);
    const sessionTime = Math.floor((new Date() - new Date(mission.locked_in_at)) / 1000); // in seconds

    await missions.updateOne(
      { _id: mission._id },
      {
        $set: {
          time_taken: totalTime,
          locked_in_at: null,
        },
      }
    );

    await interaction.update({
      components: [interaction.message.components[0]],
      flags: MessageFlags.IsComponentsV2,
    });

    const text = new TextDisplayBuilder().setContent(
      "`Checked out on:` `⭕️` " +
        formatMission(mission) +
        " `⏱️ " +
        formatTime(totalTime) +
        " (+" +
        formatTime(sessionTime) +
        ")`"
    );

    const lockInButton = new ButtonBuilder()
      .setCustomId(`lockin_${code}`)
      .setLabel("🔐 Lock In")
      .setStyle(ButtonStyle.Secondary);

    const missionsButton = new ButtonBuilder()
      .setCustomId(`missions_`)
      .setLabel("📖 Show Missions")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(lockInButton, missionsButton);

    return interaction.followUp({
      components: [text, row],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
