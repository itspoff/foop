import { ObjectId } from "mongodb";
import {
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getMissionCard } from "../components/missionComponents.js";

export function getEditMissionModal(mission) {
  const modal = new ModalBuilder().setCustomId(`edit_modal_submit:${mission._id}`).setTitle("Edit mission");
  const titleInput = new TextInputBuilder()
    .setCustomId("edit_input_title")
    .setStyle(TextInputStyle.Short)
    .setValue(mission.name)
    .setRequired(true);

  const titleLabel = new LabelBuilder().setLabel("Mission title:").setTextInputComponent(titleInput);

  const missionTypeSelect = new StringSelectMenuBuilder()
    .setCustomId("edit_input_type")
    .setRequired(false)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Daily")
        .setDescription("This mission will reset every day.")
        .setValue("daily"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Standard")
        .setDescription("Nothing special. Just a regular ol' mission.")
        .setValue("standard")
    );

  const missionTypeLabel = new LabelBuilder().setLabel("Mission type:").setStringSelectMenuComponent(missionTypeSelect);

  const descInput = new TextInputBuilder()
    .setCustomId("edit_input_desc")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(mission.description)
    .setRequired(false);

  const descLabel = new LabelBuilder().setLabel("Mission description:").setTextInputComponent(descInput);

  const missionReset = new StringSelectMenuBuilder()
    .setCustomId("edit_input_reset")
    .setPlaceholder("Select to reset this mission.")
    .setRequired(false)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("Do not").setValue("no"),
      new StringSelectMenuOptionBuilder().setLabel("Reset mission").setValue("yes")
    );

  const missionResetLabel = new LabelBuilder()
    .setLabel("Reset this mission?")
    .setDescription("This will remove any streaks, time elapsed, and cheers on this mission.")
    .setStringSelectMenuComponent(missionReset);

  modal.addLabelComponents(titleLabel, missionTypeLabel, descLabel, missionResetLabel);

  return modal;
}

export default {
  prefix: "edit_modal_submit",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");

    const title = interaction.fields.getTextInputValue("edit_input_title")?.trim();
    const type = interaction.fields.getStringSelectValues("edit_input_type");
    const desc = interaction.fields.getTextInputValue("edit_input_desc")?.trim();
    const reset = interaction.fields.getStringSelectValues("edit_input_reset");

    const isDaily = type == "daily";

    let [_, missionId] = interaction.customId.split(":");
    missionId = ObjectId.createFromHexString(missionId);
    const mission = await missions.findOne({
      _id: missionId,
    });

    console.log(mission);
    const missionUpdate = {
      $set: {
        name: title,
        description: desc,
        is_daily: isDaily,
      },
    };

    const updatedMission = await missions.updateOne(
      {
        _id: missionId,
      },
      missionUpdate
    );

    const missionCard = await getMissionCard(updatedMission);

    return interaction.update({
      components: [missionCard],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  },
};
