import { LabelBuilder, ModalBuilder, TextDisplayBuilder, TextInputBuilder } from "@discordjs/builders";
import { MessageFlags, TextInputStyle } from "discord.js";
import { ObjectId } from "mongodb";
import { formatMission } from "../utils/formatter.js";

const placeholders = [
  "", // default
  "You can do it!",
  "Is this task bothering you?",
];

export function getCheerModal(userToCheer = "a friend", missionId) {
  const modal = new ModalBuilder()
    .setCustomId(`cheer_modal_submit:${missionId}`)
    .setTitle(`Cheer for ${userToCheer} 🎉`);

  const placeholder =
    Math.random() < 0.5 ? placeholders[0] : placeholders[Math.floor(Math.random() * (placeholders.length - 1)) + 1];

  const textDescription = new TextDisplayBuilder().setContent(
    `Use 250 ppts to cheer for this mission? \n-# ${userToCheer} will receive double the rewards on completion.`
  );
  const messageInput = new TextInputBuilder()
    .setCustomId("cheer_input_message")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(placeholder)
    .setRequired(false);

  const messageLabel = new LabelBuilder().setLabel("Add a message").setTextInputComponent(messageInput);

  modal.addTextDisplayComponents(textDescription).addLabelComponents(messageLabel);
  return modal;
}

export default {
  prefix: "cheer_modal_submit",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");
    const users = db.collection("users");

    let [_, missionId] = interaction.customId.split(":");
    missionId = ObjectId.createFromHexString(missionId);
    const mission = await missions.findOne({
      _id: missionId,
      locked_in_at: { $ne: null },
    });

    if (!mission) {
      return interaction.reply({
        content: "> `❌ Mission not found or not locked in.`",
        ephemeral: true,
      });
    }
    if (user.ppts < 250) {
      return interaction.reply({
        content: "> `❌ You don't have enough points to cheer!`",
        ephemeral: true,
      });
    }
    const alreadyCheered = mission.cheers?.includes(user._id);
    if (alreadyCheered) {
      return interaction.reply({
        content: "> `❌ You already cheered for this mission.`",
        ephemeral: true,
      });
    }

    const message = interaction.fields.getTextInputValue("cheer_input_message")?.trim() || "You got this!";

    const text = new TextDisplayBuilder().setContent(
      `\`${message}\`
> \`${user.display_name} cheered for\` ${formatMission(mission)}`
    );

    // store message id of the mission card? and update the card

    await users.updateOne({ _id: user._id }, { $inc: { ppts: -25 } });
    await missions.updateOne({ _id: missionId }, { $addToSet: { cheers: user._id } });

    await interaction.reply({
      components: [text],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
