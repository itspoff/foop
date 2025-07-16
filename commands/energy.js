import { InteractionContextType, SlashCommandBuilder } from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import { formatReason } from "../utils/formatReason.js";

export const data = new SlashCommandBuilder()
  .setName("energy")
  .setDescription("Update your energy level")
  .setContexts([
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ])
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Amount to change energy by")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("reason").setDescription("Reason for energy change")
  );

export async function execute(interaction) {
  const db = await connectToDatabase();
  const users = db.collection("users");

  const amount = interaction.options.getInteger("amount");
  const reasonRaw = interaction.options.getString("reason")?.trim();
  const reason = formatReason(reasonRaw);
  const user = await getOrCreateUser(interaction.user, interaction.member);

  const currEnergy = user.energy ?? 100;
  let newEnergy = currEnergy + amount;

  newEnergy = Math.min(100, Math.max(0, newEnergy));

  await users.updateOne(
    { _id: user._id },
    { $set: { energy: newEnergy, last_updated: new Date() } }
  );

  const changeWord = amount >= 0 ? `[2;33mup[0m` : `[2;34mdown[0m`;
  const absAmount = Math.abs(amount);

  const msg = [];
  msg.push(`\`\`\`ansi`);
  if (reason) msg.push(formatReason(reason));
  if (newEnergy === 100) {
    msg.push(`Energy is [2;33mfull[0m.`);
  } else msg.push(`Energy went ${changeWord} by ${absAmount}.`);
  msg.push(`\`\`\``);

  await interaction.reply({ content: msg.join("\n") });
}
