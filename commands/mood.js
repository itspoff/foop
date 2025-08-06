import {
  InteractionContextType,
  MessageFlags,
  SectionBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import { formatMood, formatReason } from "../utils/formatLabels.js";
import { getCurrentPST } from "../utils/formatTime.js";

export const data = new SlashCommandBuilder()
  .setName("mood")
  .setDescription("Update your mood")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addStringOption((option) =>
    option
      .setName("value")
      .setDescription("Mood direction")
      .setRequired(true)
      .addChoices({ name: "up", value: "up" }, { name: "down", value: "down" })
  )
  .addStringOption((option) => option.setName("reason").setDescription("Reason for mood change"));

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

  await users.updateOne({ _id: user._id }, { $set: { mood: newMood, last_updated: getCurrentPST().toJSDate() } });

  const msg = new TextDisplayBuilder().setContent(
    `${formatReason(reason)}\n> \`Mood went ${value}\`\n> \`Mood is now\` ${formatMood(newMood)}`
  );
  const thumbnail = new ThumbnailBuilder()
    .setDescription("user display avatar")
    .setURL(interaction.user.displayAvatarURL());
  const lockInMessage = new SectionBuilder().addTextDisplayComponents(msg).setThumbnailAccessory(thumbnail);

  return interaction.reply({
    components: [lockInMessage],
    flags: MessageFlags.IsComponentsV2,
  });
}
