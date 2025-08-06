import { SectionBuilder, SeparatorBuilder, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import { formatTime, getCurrentPST } from "../utils/formatTime.js";

export function getDailyReport(user, discordUser, dailyMissions, allMissions) {
  const now = getCurrentPST();
  const date = now.toLocaleString({
    weekday: "long",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const dailiesCompleted = dailyMissions.filter((m) => m.is_complete).length;
  const allCompleted = allMissions.filter((m) => m.is_complete).length;
  let totalTimeTaken = 0;
  let pptsGained = 0;
  let cheers = 0;
  for (const mission of allMissions) {
    if (mission.time_taken) {
      totalTimeTaken += mission.time_taken;
    }
    if (mission.ppts_gained) {
      pptsGained += mission.ppts_gained;
    }
    if (mission.cheers) {
      cheers += mission.cheers.length;
    }
  }

  const allDailiesCompleted = dailiesCompleted === dailyMissions.length;

  const text = `## \`📋 Daily Report for ${user.display_name}\`
-# \`${date}\` \`💮\` \`Day Cleared!\`

> \`Daily missions:      \` \` ${dailiesCompleted} / ${dailyMissions.length}\` ${
    allDailiesCompleted ? `\`🔥 x${user.daily_streak ? user.daily_streak + 1 : 1}\`` : ""
  }
> \`All missions:        \` \` ${allCompleted} / ${allMissions.length}\`
> \`Locked in for:       \` \` ${formatTime(totalTimeTaken)}\`

> \`Ppts gained:         \` \` +${pptsGained}\`
> \`Cheers received:     \` \` ${cheers}\` 

`;

  const msg = new TextDisplayBuilder().setContent(text);
  const thumbnail = new ThumbnailBuilder()
    .setDescription("test")
    .setURL(user.display_avatar_url || discordUser.displayAvatarURL());
  const section = new SectionBuilder().addTextDisplayComponents(msg).setThumbnailAccessory(thumbnail);
  return {
    section,
    allDailiesCompleted,
  };
}
