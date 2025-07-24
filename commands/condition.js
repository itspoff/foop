import { InteractionContextType, SlashCommandBuilder } from "discord.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import { formatCondition, formatHelpText } from "../utils/formatLabels.js";

export const data = new SlashCommandBuilder()
  .setName("condition")
  .setDescription("Add or clear a condition")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription('Input the condition name or type "clear" instead to remove all')
      .setRequired(true)
  )
  .addIntegerOption((option) => option.setName("timer").setDescription("Clear this condition after x hours"))
  .addBooleanOption((option) =>
    option.setName("positive").setDescription("Is this condition positive? Defaults to positive.")
  );

export async function execute(interaction) {
  const db = await import("../db.js").then((m) => m.default());
  const users = db.collection("users");
  const user = await getOrCreateUser(interaction.user, interaction.member);

  const name = interaction.options.getString("name").toLowerCase();
  const timer = interaction.options.getInteger("timer") ?? 1;
  const isPositive = interaction.options.getBoolean("positive") ?? true;

  if (name === "clear") {
    await users.updateOne(
      { _id: user._id },
      {
        $set: { conditions: [] },
      }
    );

    return interaction.followUp(`\`All conditions cleared.\``);
  }

  const expiresAt = new Date(Date.now() + timer * 60 * 60 * 1000); // convert hours to ms
  const newCondition = { name, expires_at: expiresAt, is_positive: isPositive };

  if (timer <= 0) {
    await users.findOneAndUpdate(
      { _id: user._id },
      {
        $pull: { conditions: { name } },
      }
    );

    return interaction.followUp(`\`Condition\` ${formatCondition(newCondition)} \`expired.\``);
  }

  await users.findOneAndUpdate(
    { _id: user._id },
    {
      $pull: { conditions: { name } }, // replace existing with same name
    }
  );

  await users.updateOne(
    { _id: user._id },
    {
      $push: { conditions: newCondition },
    }
  );

  const helpText = formatHelpText(
    "use /condition with the same name to update the condition's timer or change it from positive to negative."
  );

  return interaction.followUp(
    `\`Condition\` ${formatCondition(newCondition)} \`added for ${timer} hour(s).\`${helpText}`
  );
}
