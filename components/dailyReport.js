import { SectionBuilder, SeparatorBuilder, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import { getDailyButtonRow } from "../utils/buttonRows.js";

export function getDailyReport(discordUser, user) {
  const text = `## \`📋 Daily Report\`
-# \`Monday, August 1\` \`💮\` \`Day Cleared!\`

> \`Daily missions:      \` \` 7 / 7\` \`🔥 x15\`
> \`All missions:        \` \`14 /14\` \`⭐ NEW RECORD\`
> \`Locked in for:       \` \` 6 :10\`

> \`Ppts gained:         \` \`  +882\`
> \`Cheers received:     \` \`     2\` 

`;

  const msg = new TextDisplayBuilder().setContent(text);
  const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
  const thumbnail = new ThumbnailBuilder().setDescription("test").setURL(user.displayAvatarURL());
  const dailyReport = new SectionBuilder().addTextDisplayComponents(msg).setThumbnailAccessory(thumbnail);
  const discordUser = discordUser;
  const buttons = getDailyButtonRow(discordUser);
  return {
    dailyReport,
    separator,
    buttons,
  };
}
