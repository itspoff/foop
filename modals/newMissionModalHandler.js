import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { generateUniqueCode } from "../utils/generateUniqueCode.js";
import { formatMission } from "../utils/formatLabels.js";
import { getMissionButtonRow } from "../utils/buttonRows.js";

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
      is_complete: false,
      is_daily: isDaily,
      is_system: false,
      created_at: getCurrentPST().toJSDate(),
      updated_at: getCurrentPST().toJSDate(),
      time_taken: null,
      locked_in_at: null,
    };

    await missions.insertOne(mission);

    const text = new TextDisplayBuilder().setContent("`Added new mission:` `⭕️` " + formatMission(mission));

    const row = getMissionButtonRow(missionCode);

    await interaction.reply({
      components: [text, row],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
