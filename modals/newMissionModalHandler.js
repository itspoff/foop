import { MessageFlags } from "discord.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { generateUniqueCode } from "../utils/generateUniqueCode.js";
import { getMissionCard } from "../components/missionComponents.js";

export default {
  prefix: "new_modal_submit",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");

    const title = interaction.fields.getTextInputValue("new_input_title")?.trim();
    const desc = interaction.fields.getTextInputValue("new_input_desc")?.trim() || "";
    const isDailyInput = interaction.fields.getTextInputValue("new_input_daily")?.trim().toUpperCase();

    const isDaily = isDailyInput === "T";
    if (!["T", "F"].includes(isDailyInput)) {
      return await interaction.reply({
        content: "`❌ Invalid input for daily field. Please enter T or F.`",
        ephemeral: true,
      });
    }

    const missionCode = await generateUniqueCode(missions);

    const mission = {
      user_id: user._id,
      code: missionCode,
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
