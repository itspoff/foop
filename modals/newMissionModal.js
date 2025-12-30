import {
  ActionRowBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { getMissionCard } from "../components/missionComponents.js";
import { getMissionListDisplay } from "../utils/formatter.js";

const placeholders = [
  "", // default
  "Has anyone said you're the BEST yet today?",
  "Good good study, day day up.",
  "Is this task bothering you?",
  "You can do this, I believe in you!",
  "I know you got this.",
  "Sending you energy to get through the day!",
  "uuuuuuuuu umapyoi! umayaoi!",
  "It's what Himmel the Hero would have done.",
  "你来啦！小可爱！",
  "GOAT GOAT GOAT",
];

export function getNewMissionModal(value = "") {
  const placeholder =
    Math.random() < 0.3 ? placeholders[0] : placeholders[Math.floor(Math.random() * (placeholders.length - 1)) + 1];

  const modal = new ModalBuilder().setCustomId("new_modal_submit").setTitle("Yeah—add this to the list.");

  const titleInput = new TextInputBuilder()
    .setCustomId("new_input_title")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(placeholder)
    .setValue(value)
    .setRequired(true);

  const titleLabel = new LabelBuilder().setLabel("Mission Title").setTextInputComponent(titleInput);

  const missionTypeSelect = new StringSelectMenuBuilder()
    .setCustomId("new_input_type")
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

  const missionTypeLabel = new LabelBuilder().setLabel("Mission Type").setStringSelectMenuComponent(missionTypeSelect);

  const descInput = new TextInputBuilder()
    .setCustomId("new_input_desc")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const descLabel = new LabelBuilder().setLabel("Description").setTextInputComponent(descInput);

  modal.addLabelComponents(titleLabel, missionTypeLabel, descLabel);

  return modal;
}

export default {
  prefix: "new_modal_submit",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");

    const title = interaction.fields.getTextInputValue("new_input_title")?.trim();
    const desc = interaction.fields.getTextInputValue("new_input_desc")?.trim() || "";
    const type = interaction.fields.getStringSelectValues("new_input_type");

    const isDaily = type == "daily";

    const mission = {
      user_id: user._id,
      name: title,
      description: desc,
      date_created: getCurrentPST().toJSDate(),
      is_complete: false,
      is_daily: isDaily,
      is_system: false,
      time_taken: null,
      locked_in_at: null,
      ppts_gained: 0,
      count: 0,
      completed_count: 0,
      cheers: [],
      ...(isDaily && {
        current_streak: 0,
        highest_streak: 0,
        last_completed_at: null,
      }),
    };

    await missions.insertOne(mission);
    const missionCard = await getMissionCard(mission);

    const missionListDisplay = await getMissionListDisplay(interaction, db);
    await interaction.update(missionListDisplay);

    await interaction.followUp({
      components: [missionCard],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  },
};
