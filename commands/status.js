import {
  SlashCommandBuilder,
  InteractionContextType,
  MessageFlags,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
} from "discord.js";
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
  formatThoughtBubble,
} from "../utils/formatLabels.js";
import { timeSince } from "../utils/formatTime.js";
import { getOwnStatusButtonRow, getStatusButtonRow } from "../utils/buttonRows.js";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Send a status update!")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addUserOption((option) => option.setName("user").setDescription("User to check status of"));

export async function execute(interaction) {
  const db = await connectToDatabase();
  const tagsCollection = db.collection("tags");
  const missionsCollection = db.collection("missions");

  const selectedUser = interaction.options.getUser("user");
  const targetUser = selectedUser || interaction.user;

  const isOtherUser = !!selectedUser && interaction.user.id !== selectedUser.id;
  const avatarURL = isOtherUser ? selectedUser.displayAvatarURL() : interaction.user.displayAvatarURL();

  const user = await getOrCreateUser(targetUser);
  const displayName = formatDisplayName(user.display_name || interaction.user.globalName);
  const mood = formatMood(user.mood || "normal");
  const energy = formatEnergy(user.energy ?? 100);
  const ppts = user.ppts;
  const lastUpdated = user.last_updated ? timeSince(user.last_updated) : "unknown";

  // Display current tag
  const activeTag = user.active_tag ? await tagsCollection.findOne({ code: user.active_tag }) : null;
  const displayTag = activeTag ? formatDisplayTag(activeTag) : "";

  // Display locked-in mission (if any)
  const lockedInMission = await missionsCollection.findOne({
    user_id: user._id,
    locked_in_at: { $ne: null },
  });
  const displayLockedInMission = formatLockedInMission(lockedInMission);

  // Conditions
  const displayConditions = formatConditionList(user.conditions);

  // thought bubble
  const thoughtBubble = formatThoughtBubble(user.thought_bubble) ?? "`🧠 Head empty. No thoughts. `";

  // Header
  const statusUpdate = `## ${displayName}  ${mood}  ${energy}  
-#  ${displayTag ? `${displayTag}  |` : ""}  \`Last Updated: ${lastUpdated} ago\`  |  \`PPts: ${ppts}\`
> **\`Current thought: \`** ${thoughtBubble}
> **\`Locked in on:    \`** ${displayLockedInMission}`;

  const displayMissions = await showMissionList(interaction, user, missionsCollection, null, "", false);

  const missions = new TextDisplayBuilder().setContent(displayMissions);

  const footer = isOtherUser
    ? getStatusButtonRow(user, isOtherUser, lockedInMission, { disableCheer: !lockedInMission })
    : getOwnStatusButtonRow(user);

  const header = new TextDisplayBuilder().setContent(statusUpdate);

  const thumbnail = new ThumbnailBuilder().setDescription("test").setURL(avatarURL);
  const headerSection = new SectionBuilder().addTextDisplayComponents(header).setThumbnailAccessory(thumbnail);

  return interaction.reply({
    components: [headerSection, missions, footer],
    flags: MessageFlags.IsComponentsV2,
  });
}
