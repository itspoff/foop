import { InteractionContextType, SlashCommandBuilder } from "discord.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import { formatCondition } from "../utils/formatLabels.js";

export const data = new SlashCommandBuilder()
  .setName("condition")
  .setDescription("Manage user conditions")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add a condition that expires after a timer")
      .addStringOption((option) => option.setName("name").setDescription("Condition name").setRequired(true))
      .addIntegerOption((option) => option.setName("timer").setDescription("Clear after x hours"))
      .addBooleanOption((option) => option.setName("is_positive").setDescription("Is this condition positive?"))
  )
  .addSubcommand((sub) => sub.setName("clear").setDescription("Clears all conditions"));

export async function execute(interaction) {
  const db = await import("../db.js").then((m) => m.default());
  const users = db.collection("users");
  const user = await getOrCreateUser(interaction.user, interaction.member);

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "add") {
    const name = interaction.options.getString("name").toLowerCase();
    const timer = interaction.options.getInteger("timer") || 12;
    const isPositive = interaction.options.getBoolean("is_positive") ?? true;

    if (timer <= 0) {
      return interaction.followUp({
        content: "`❌ Timer must be greater than 0 hours.`",
        ephemeral: true,
      });
    }

    const expiresAt = new Date(Date.now() + timer * 60 * 60 * 1000); // convert hours to ms

    const newCondition = { name, expires_at: expiresAt, is_positive: isPositive };

    await users.findOneAndUpdate(
      { _id: user._id },
      {
        $pull: { conditions: { name } }, // remove existing with same name
      }
    );

    await users.updateOne(
      { _id: user._id },
      {
        $push: { conditions: newCondition },
      }
    );

    return interaction.followUp(`\`Condition\` ${formatCondition(newCondition)} \`added for ${timer} hour(s).\``);
  } else if (subcommand === "clear") {
    await users.updateOne(
      { _id: user._id },
      {
        $set: { conditions: [] },
      }
    );

    return interaction.followUp(`\`All conditions cleared.\``);
  }
}
