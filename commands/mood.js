import { InteractionContextType, SlashCommandBuilder } from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import { formatMood, formatReason } from "../utils/formatLabels.js";

export const data = new SlashCommandBuilder()
  .setName("mood")
  .setDescription("Update your mood")
  .setContexts([
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ])
  .addStringOption((option) =>
    option
      .setName("value")
      .setDescription("Mood direction")
      .setRequired(true)
      .addChoices({ name: "up", value: "up" }, { name: "down", value: "down" })
  )
  .addStringOption((option) =>
    option.setName("reason").setDescription("Reason for mood change")
  );

export async function execute(interaction) {
  const db = await connectToDatabase();
  const users = db.collection("users");

  const value = interaction.options.getString("value");
  const reason = interaction.options.getString("reason")?.trim();
  const user = await getOrCreateUser(interaction.user, interaction.member);

  const moods = ["awful", "bad", "normal", "good", "great"];
  const currentMoodIndex = moods.indexOf(user.mood || "normal");

  let newMood = user.mood || "normal";

  if (value === "up") {
    newMood = moods[Math.min(currentMoodIndex + 1, moods.length - 1)];
  } else if (value === "down") {
    newMood = moods[Math.max(currentMoodIndex - 1, 0)];
  }

  await users.updateOne(
    { _id: user._id },
    { $set: { mood: newMood, last_updated: new Date() } }
  );

  const moodUpdate = `${formatReason(reason)}
\`Mood went ${value}!\`
\`Mood is now\` ${formatMood(newMood)}`;

  // const msg = [];
  // msg.push(`\`\`\`ansi`);
  // if (reason) msg.push(formatReason(reason));
  // const moodMsg = value === "down" ? `Mood went [2;34mdown[0m.` : `Mood went [2;33mup[0m.`;

  // msg.push(moodMsg);
  // msg.push(`\`\`\``);

  await interaction.followUp({ content: moodUpdate });
}
