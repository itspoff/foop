import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
} from "discord.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";

export const data = new SlashCommandBuilder()
  .setName("pull")
  .setDescription("Pull for tags you can apply to your status!")
  .setContexts([
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ]);

export async function execute(interaction) {
  const user = await getOrCreateUser(interaction.user, interaction.member);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pull_1x")
      .setLabel("✨️ 1x Pull (-100)✨️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("pull_10x")
      .setLabel("💥 10x Pull (-1000)💥")
      .setStyle(ButtonStyle.Success)
  );

  const ggstBanner = `# *\`Guilty Gear -Strive-\`*
\`Custom Tag Banner\` \`${user.display_name}'s PPts: ${user.ppts}\`
** **`;

  await interaction.followUp({
    content: ggstBanner,
    components: [row],
    ephemeral: true,
  });
}
