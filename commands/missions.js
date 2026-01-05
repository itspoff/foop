import { SlashCommandBuilder, InteractionContextType } from "discord.js";
import connectToDatabase from "../db.js";
import { getMissionListDisplay } from "../utils/formatter.js";
import { MissionTabOptions } from "../selects/missionTabSelect.js";

export const data = new SlashCommandBuilder()
  .setName("missions")
  .setDescription("Manage your missions.")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);

export async function execute(interaction, db) {
  const message = await getMissionListDisplay(interaction, db, MissionTabOptions.ALL);

  return interaction.reply(message);
}
