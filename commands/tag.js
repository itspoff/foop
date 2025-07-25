// commands/tag.js
import { InteractionContextType, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import connectToDatabase from "../db.js";
import { formatDisplayTag, formatPulledTag } from "../utils/formatLabels.js";

export const data = new SlashCommandBuilder()
  .setName("tag")
  .setDescription("Set your active tag")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addStringOption((option) => option.setName("code").setDescription("Tag code to activate"));

export async function execute(interaction) {
  const db = await connectToDatabase();
  const users = db.collection("users");
  const tags = db.collection("tags");

  const tagCode = interaction.options.getString("code");
  const user = await getOrCreateUser(interaction.user, interaction.member);

  if (!user.tags || user.tags.length === 0) {
    await interaction.followUp({
      content: "`❌ You don't have any tags yet.`",
    });
    return;
  }

  if (tagCode) {
    // validate the tag code exists in tag database
    const tag = await tags.findOne({ code: tagCode });
    if (!tag) {
      await interaction.followUp({
        content: `\`❌ Tag \` \`${tagCode}\` \`does not exist.\``,
      });
      return;
    }

    // Check if the user owns the tag
    if (!user.tags || !user.tags.includes(tagCode)) {
      await interaction.followUp({
        content: `\`❌ You do not own the tag\` \`${tag.name}\``,
      });
      return;
    }

    // Update the user's active tag
    await users.updateOne({ _id: user._id }, { $set: { active_tag: tagCode, last_updated: new Date() } });

    await interaction.followUp({
      content: `\`✅ Your active tag has been set to:\` \`${tag.name}\``,
    });
  }

  const userTags = await tags.find({ code: { $in: user.tags } }).toArray();

  const formatted = userTags.map((t) => {
    const isActive = t.code === user.active_tag ? "  `🐾 Applied!`" : "";
    return `-# \`${t.code}\` ${formatDisplayTag(t)} ${isActive}`;
  });

  await interaction.followUp({
    content: `## \`${user.display_name}'s tag inventory:\`\n${formatted.join("\n")}`,
    ephemeral: true,
  });
}
