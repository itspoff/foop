import { SlashCommandBuilder, InteractionContextType, MessageFlags } from "discord.js";
import { createEventSub, getUserAccessToken } from "../services/twitchService.js";

export const data = new SlashCommandBuilder()
  .setName("streamer")
  .setDescription("Manage Twitch stream notifications.")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Enable alerts for a streamer.")
      .addStringOption((opt) =>
        opt
          .setName("username")
          .setDescription("The Twitch channel login name (e.g., ninja, pokimane)")
          .setRequired(true))
  )
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);

export async function execute(interaction, db) {
  await interaction.deferReply({ ephemeral: true });

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "add") {
    await handleAddStreamer(interaction, db);
  }
}

async function handleAddStreamer(interaction, db) {
  const twitchUsername = interaction.options.getString("username").toLowerCase().trim();
  const discordChannelId = interaction.channelId;
  const guildId = interaction.guildId;

  const sessionId = interaction.twitchSessionId;
  if (!sessionId) {
    return interaction.editReply({
      content: "Twitch WebSocket service is currently offline. Please wait a few moments and try again.",
    });
  }

  try {
    const token = await getUserAccessToken();

    const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${twitchUsername}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Client-Id": process.env.TWITCH_CLIENT_ID,
      },
    });

    if (!userResponse.ok) {
      return interaction.editReply({ content: "❌ Failed to connect to Twitch services." });
    }

    const userData = await userResponse.json();
    if (!userData.data || userData.data.length === 0) {
      return interaction.editReply({ content: `> ❌ Could not find a Twitch user named: **${twitchUsername}**.` });
    }

    const broadcasterId = userData.data[0].id;
    const correctDisplayName = userData.data[0].display_name;

    const onlineSuccess = await createEventSub(sessionId, "stream.online", "1", broadcasterId);
    const offlineSuccess = await createEventSub(sessionId, "stream.offline", "1", broadcasterId);

    if (!onlineSuccess || !offlineSuccess) {
      return interaction.editReply({ content: `> ❌ Subscription rejected by Twitch. Check your API access tokens.` });
    }

    await db.collection("twitch_channels").updateOne(
      { broadcaster_id: broadcasterId, guild_id: guildId },
      {
        $set: {
          broadcaster_id: broadcasterId,
          broadcaster_name: correctDisplayName,
          broadcaster_user_login: twitchUsername,
          discord_channel_id: discordChannelId,
          guild_id: guildId,
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );

    return interaction.editReply({
      content: `Stream alerts for **${correctDisplayName}** are now routed to <#${discordChannelId}>!`,
    });
  } catch (error) {
    console.error("> ❌ Error running /streamer add:", error);
    return interaction.editReply({ content: "> ❌ Critical internal failure configuring subscription." });
  }
}
