import { AttachmentBuilder, MessageFlags, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import { formatMission, getMissionListDisplay } from "../utils/formatter.js";
import { formatTime } from "../utils/formatTime.js";
import { getMissionCard } from "../components/missionComponents.js";
import { processMissionCheckout } from "../logic/missionLogic.js";

export default {
  prefix: "checkout_",
  async execute(interaction, { db, user, value }) {
    if (!value.endsWith(interaction.user.id)) {
      return interaction.reply({
        components: [new TextDisplayBuilder().setContent("> `🥀 This isn't your button.`")],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    }

    const missions = db.collection("missions");
    const [missionId, parent] = value.split("_");
    const mission = await missions.findOne({
      user_id: user._id,
      locked_in_at: { $ne: null },
      is_complete: { $ne: true },
    });

    if (!mission) {
      const file = new AttachmentBuilder("assets/poff-icon.png", { name: "poff-icon.png" });
      const msg = new TextDisplayBuilder().setContent(
        "`🗨️` `can you lock the fuck in`\n> `Lock in on a mission first.`"
      );
      const lockInMessage = new SectionBuilder()
        .addTextDisplayComponents(msg)
        .setThumbnailAccessory(new ThumbnailBuilder().setDescription("poff").setURL("attachment://poff-icon.png"));

      return interaction.reply({
        components: [lockInMessage],
        files: [file],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
      });
    }

    const { totalTime, sessionTime } = await processMissionCheckout(db, user, mission);

    const checkoutText = new TextDisplayBuilder().setContent(
      `> \`💨 Checked out on:\` ${formatMission(mission)} \`⏱️ ${formatTime(totalTime)} (+${formatTime(sessionTime)})\``
    );

    const updatePayload = await getUpdatePayload(parent, interaction, db, user, mission, checkoutText);
    await interaction.update(updatePayload);

    if (parent !== "confirm") {
      return interaction.followUp({
        components: [checkoutText],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};

async function getUpdatePayload(parent, interaction, db, user, mission, checkoutText) {
  switch (parent) {
    case "status":
      return await getMissionListDisplay(interaction, db);

    case "confirm":
      return { components: [checkoutText], flags: MessageFlags.IsComponentsV2 };

    default: {
      const updatedMission = await db.collection("missions").findOne({ _id: mission._id });
      const missionCard = await getMissionCard(updatedMission);
      return {
        components: [missionCard],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      };
    }
  }
}
