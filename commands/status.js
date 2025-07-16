import { SlashCommandBuilder, InteractionContextType } from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";

/**
 * Utility: format time difference in human-readable string
 */
function timeSince(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("View someone's status")
  .setContexts([
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ])
  .addUserOption((option) =>
    option.setName("user").setDescription("User to check status of")
  );

export async function execute(interaction) {
  const db = await connectToDatabase();
  const users = db.collection("users");

  const target = interaction.options.getUser("user") || interaction.user;
  const member = target.id === interaction.user.id ? interaction.member : null;
  const user = await getOrCreateUser(target, member);

  const mood = (user.mood || "normal").toUpperCase();
  const energy = user.energy ?? 100;

  const lastUpdated = user.last_updated
    ? timeSince(new Date(user.last_updated))
    : "unknown";

  const displayName = user.nickname || target.username;

  const msg = [];
  msg.push(`\`\`\`ansi`);
  msg.push(`${displayName}'s Status`);
  msg.push(`Mood: ${mood.toUpperCase()} | Energy: [2;33m${energy}[0m / 100`);
  msg.push(`\`\`\``);
  msg.push(`-# Last updated: ${lastUpdated}`);
  await interaction.reply({ content: msg.join("\n") });
}
