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
import { getMissionButtonRow } from "../utils/buttonRows.js";
import { getMissionCard } from "../components/missionComponents.js";

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

    if (code) {
      if (mission.code !== code) {
        return interaction.reply({
          content: "> `❌ Hey! This isn't your mission.`",
          ephemeral: true,
        });
      }
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

    const updatedMission = await missions.findOne({
      user_id: user._id,
      _id: mission._id,
    });

    const missionCard = getMissionCard(updatedMission);
    await interaction.update({
      components: [missionCard],
      flags: MessageFlags.IsComponentsV2,
    });

    const text = new TextDisplayBuilder().setContent(
      "`💨 Checked out on:` " +
        formatMission(mission) +
        " `⏱️ " +
        formatTime(totalTime) +
        " (+" +
        formatTime(sessionTime) +
        ")`"
    );

    return interaction.followUp({
      components: [text],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
