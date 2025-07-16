import { InteractionContextType, SlashCommandBuilder } from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";

export const data = new SlashCommandBuilder()
  .setName("friendship")
  .setDescription("Increase friendship")
  .setContexts([
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ])
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("User to train with")
      .setRequired(true)
  );

export async function execute(interaction) {
  const targetUser = interaction.options.getUser("user");

  if (targetUser.bot) {
    return interaction.reply({
      content: "You can't increase friendship with bots.",
      ephemeral: true,
    });
  }
  const db = await connectToDatabase();
  const users = db.collection("users");

  const initiator = await getOrCreateUser(interaction.user, interaction.member);
  await getOrCreateUser(targetUser);

  const bondBase = 5;
  const bonus = Math.floor(Math.random() * 5) + 1;
  const bondIncrease = bondBase + bonus;

  const field = `friendships.${targetUser.id}`;
  await users.updateOne(
    { _id: initiator._id },
    {
      $inc: { [field]: bondIncrease },
      $set: { last_updated: new Date() },
    }
  );

  const msg = [];
  msg.push(`\`\`\`ansi`);
  msg.push(
    `Friendship with ${targetUser.username} went [2;33mup[0m by [2;33m${bondIncrease}[0m.`
  );
  msg.push(`\`\`\``);

  await interaction.reply({ content: msg.join("\n") });
}
