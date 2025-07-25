import { SlashCommandBuilder, InteractionContextType } from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import {
  formatMood,
  formatEnergy,
  formatDisplayName,
  formatDisplayTag,
  formatLockedInMission,
  showMissionList,
  formatConditionList,
} from "../utils/formatLabels.js";
import { timeSince } from "../utils/formatTime.js";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Send a status update!")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addUserOption((option) => option.setName("user").setDescription("User to check status of"));

export async function execute(interaction) {
  const db = await connectToDatabase();
  const tags = db.collection("tags");
  const missions = db.collection("missions");

  // config: privacy settings?

  const target = interaction.options.getUser("user") || interaction.user;
  const targetExists = !!interaction.options.getUser("user");

  const user = await getOrCreateUser(target);
  const conditions = user.conditions;

  const lockedInMission = await missions.findOne({
    user_id: user._id,
    locked_in_at: { $ne: null },
  });

  // header
  const displayName = formatDisplayName(user.display_name || interaction.user.globalName);

  const mood = formatMood(user.mood || "normal");
  const energy = formatEnergy(user.energy ?? 100);

  const activeTag = user.active_tag ? await tags.findOne({ code: user.active_tag }) : null;
  const tag = activeTag ? formatDisplayTag(activeTag) : "";
  const lastUpdated = user.last_updated ? timeSince(new Date(user.last_updated)) : "unknown";
  const ppts = user.ppts;

  // display bar

  const displayConditions = formatConditionList(conditions);
  const displayLockedInMission = formatLockedInMission(lockedInMission);

  // missions

  const displayMissions = await showMissionList(interaction, user, missions, null, "", false);

  const statusUpdate = `## ${displayName}  ${mood}  ${energy}  
-#  ${tag ? `${tag}  |` : ""}  \`Last Updated: ${lastUpdated}\`  |  \`PPts: ${ppts}\`
> **\`Conditions:    \`** ${displayConditions}
> **\`Locked in on:  \`** ${displayLockedInMission}
${targetExists ? "" : displayMissions}`;

  await interaction.followUp({ content: statusUpdate });
}
