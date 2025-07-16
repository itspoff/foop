import { SlashCommandBuilder, InteractionContextType } from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";

export const data = new SlashCommandBuilder()
  .setName("goal")
  .setDescription("Manage your goals")
  .setContexts([
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ])
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add a new goal")
      .addStringOption((opt) =>
        opt.setName("name").setDescription("Goal name").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("lockin")
      .setDescription("Start tracking time for a goal")
      .addStringOption((opt) =>
        opt.setName("name").setDescription("Goal name").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("complete")
      .setDescription("Complete a goal")
      .addStringOption((opt) =>
        opt.setName("name").setDescription("Goal name").setRequired(true)
      )
  );

export async function execute(interaction) {
  const db = await connectToDatabase();
  const goals = db.collection("goals");
  const user = await getOrCreateUser(interaction.user, interaction.member);
  const sub = interaction.options.getSubcommand();
  const name = interaction.options.getString("name");

  // goal add
  if (sub === "add") {
    const existing = await goals.findOne({ user_id: user._id, name });
    if (existing) {
      return interaction.reply({
        content: `Goal **${name}** already exists.`,
        ephemeral: true,
      });
    }

    await goals.insertOne({
      user_id: user._id,
      name,
      is_complete: false,
      time_taken: null,
      locked_in_at: null,
      attempts: 0,
    });

    const msg = [];
    msg.push(`\`\`\`ansi`);
    msg.push(`New goal [${name}] added.`);
    msg.push(`\`\`\``);

    await interaction.reply({
      content: msg.join("\n"),
    });
  }

  const goal = await goals.findOne({ user_id: user._id, name });

  if (!goal) {
    return interaction.reply({
      content: `No goal named [${name}] found.`,
      ephemeral: true,
    });
  }

  // goal lockin
  if (sub === "lockin") {
    if (goal.is_complete) {
      return interaction.reply({
        content: `Goal [${name}] is already complete.`,
        ephemeral: true,
      });
    }

    await goals.updateOne(
      { _id: goal._id },
      {
        $set: { locked_in_at: new Date() },
        $inc: { attempts: 1 },
      }
    );

    const msg = [];
    msg.push(`\`\`\`ansi`);
    msg.push(`${user.nickname} is locking in on [${name}].`);
    msg.push(`\`\`\``);

    await interaction.reply({ content: msg.join("\n") });
  }

  // goal complete
  if (sub === "complete") {
    if (goal.is_complete) {
      return interaction.reply({
        content: `Goal [${name}] is already complete.`,
        ephemeral: true,
      });
    }

    const now = new Date();
    let timeTaken = null;

    if (goal.locked_in_at) {
      timeTaken = Math.floor((now - new Date(goal.locked_in_at)) / 1000);
    }

    await goals.updateOne(
      { _id: goal._id },
      {
        $set: {
          is_complete: true,
          time_taken: timeTaken,
        },
      }
    );

    const minutes = timeTaken ? Math.round(timeTaken / 60) : null;

    const msg = [];
    msg.push(`\`\`\`ansi`);
    if (timeTaken) {
      msg.push(`Goal [${name}] completed in [2;33m${minutes}[0m mins.`);
    } else msg.push(`Goal [${name}] completed.`);

    msg.push(`\`\`\``);

    await interaction.reply({ content: msg.join("\n") });
  }
}
