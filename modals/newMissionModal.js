import { ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { getMissionCard } from "../components/missionComponents.js";

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
    .setLabel("Mission Title")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(placeholder)
    .setValue(value)
    .setRequired(true);

  const dailyInput = new TextInputBuilder()
    .setCustomId("new_input_daily")
    .setLabel("Is this task daily? (Leave blank for no.)")
    .setStyle(TextInputStyle.Short)
    .setValue("")
    .setPlaceholder('Type "Y", "T", or "Yes" to turn this into a daily task.')
    .setRequired(false)
    .setMaxLength(3)
    .setMinLength(0);

  const descInput = new TextInputBuilder()
    .setCustomId("new_input_desc")
    .setLabel("Description")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(dailyInput),
    new ActionRowBuilder().addComponents(descInput)
  );

  return modal;
}

export default {
  prefix: "new_modal_submit",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");

    const title = interaction.fields.getTextInputValue("new_input_title")?.trim();
    const desc = interaction.fields.getTextInputValue("new_input_desc")?.trim() || "";
    const isDailyInput = interaction.fields.getTextInputValue("new_input_daily")?.trim().toLowerCase();

    const trueInputs = ["t", "yes", "y"];
    const isDaily = trueInputs.includes(isDailyInput);

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
        level: 1,
        xp: 0,
        max_level: 5,
      }),
    };

    await missions.insertOne(mission);
    const missionCard = await getMissionCard(mission);

    await interaction.reply({
      components: [missionCard],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
