import { SlashCommandBuilder, InteractionContextType } from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import {
  formatMood,
  formatEnergy,
  formatDisplayName,
  formatDisplayTag,
  timeSince,
  formatDisplayMission,
  formatLockedInMission,
} from "../utils/formatLabels.js";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("View someone's status")
  .setContexts([
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ])
  .addUserOption((option) =>
    option.setName("user").setDescription("User to check status of")
  );

export async function execute(interaction) {
  const db = await connectToDatabase();
  const tags = db.collection("tags");
  const missions = db.collection("missions");

  const target = interaction.options.getUser("user") || interaction.user;
  const member = target.id === interaction.user.id ? interaction.member : null;
  const user = await getOrCreateUser(target, member);

  const userMissions = await missions
    .find({ user_id: user._id })
    .sort({ created_at: -1 })
    .toArray();

  const completedMissions = await missions
    .find({
      user_id: user._id,
      is_complete: true,
    })
    .toArray();

  const displayMissions = userMissions
    .map((m) => formatDisplayMission(m))
    .join("\n");

  const lockedInMission = await missions.findOne({
    user_id: user._id,
    locked_in_at: { $ne: null },
  });

  const displayLockedInMission = formatLockedInMission(lockedInMission);

  const displayName = formatDisplayName(
    user.display_name || interaction.user.globalName
  );

  const mood = formatMood(user.mood || "normal");
  const energy = formatEnergy(user.energy ?? 100);

  const activeTag = user.active_tag
    ? await tags.findOne({ code: user.active_tag })
    : null;

  console.log(activeTag);
  const tag = activeTag ? formatDisplayTag(activeTag) : "";

  const lastUpdated = user.last_updated
    ? timeSince(new Date(user.last_updated))
    : "unknown";

  const statusUpdate = `## ${displayName}  ${mood}  ${energy}  
-#  ${
    tag ? `${tag}  |` : ""
  }  \`Last Updated: ${lastUpdated} ago\`  |  \`PPts: ${user.ppts}\`
> **\`Conditions:    \`** \`🔵 Under\`  \`🔵 Dev\`  \`🟠 elopment\`  
> **\`Locked in on:  \`** ${displayLockedInMission}
### \`Today's Missions:\` \`${completedMissions.length} / ${
    userMissions.length
  }\`
${displayMissions}`;

  await interaction.followUp({ content: statusUpdate });
}
