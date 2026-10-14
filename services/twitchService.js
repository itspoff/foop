import WebSocket from "ws";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

let twitchWs;
let currentSessionId = null;
let userAccessToken = null;

const TWITCH_WS_URL = "wss://eventsub.wss.twitch.tv/ws";

export async function getUserAccessToken() {

    const url = new URL("https://id.twitch.tv/oauth2/token");
    url.searchParams.append("client_id", process.env.TWITCH_CLIENT_ID);
    url.searchParams.append("client_secret", process.env.TWITCH_CLIENT_SECRET);
    url.searchParams.append("grant_type", "refresh_token");
    url.searchParams.append("refresh_token", process.env.TWITCH_REFRESH_TOKEN);

    const response = await fetch(url, { method: "POST" });

    if (!response.ok) {
        const errData = await response.json();
        console.error("Failed to refresh Twitch User Token:", errData);
        throw new Error("Twitch Re-authentication failed.");
    }

    const data = await response.json();
    if (data.refresh_token && data.refresh_token !== process.env.TWITCH_REFRESH_TOKEN) {
        process.env.TWITCH_REFRESH_TOKEN = data.refresh_token;
    }

    userAccessToken = data.access_token;
    return userAccessToken;
}

export function initTwitchService(client, db) {
    function connect(url=TWITCH_WS_URL) {
        if (twitchWs) {
            twitchWs.removeAllListeners();
            twitchWs.terminate();
        }
        twitchWs = new WebSocket(url);

        twitchWs.on("open", () => {
            console.log(`Connected to Twitch EventSub WebSocket (${url === TWITCH_WS_URL ? "Primary" : "Reconnect"})`);
        });

        twitchWs.on("message", async (data) => {
            const message = JSON.parse(data.toString());
            const { message_type } = message.metadata;

            if (message_type === "session_welcome") {
                currentSessionId = message.payload.session.id;
                console.log(`Twitch WebSocket Welcome received. Session ID: ${currentSessionId}`);

                client.twitchSessionId = currentSessionId;

                try {
                    const trackedChannels = await db.collection("twitch_channels").find().toArray();
                    console.log(`Re-registering subscriptions for ${trackedChannels.length} channel(s)...`);

                    for (const channel of trackedChannels) {
                        await createEventSub(currentSessionId, "stream.online", "1", channel.broadcaster_id);
                        await createEventSub(currentSessionId, "stream.offline", "1", channel.broadcaster_id);
                    }
                } catch (err) {
                    console.error("❌ Failed to restore twitch subscriptions from database:", err);
                }
            }

            else if (message_type === "notification") {
                const { subscription, event } = message.payload;
                handleEvent(client, db, subscription.type, event);
            }

            else if (message_type === "reconnect") {
                const reconnectUrl = message.payload.session.reconnect_url;
                console.log(`🔄 Reconnecting to Twitch alternative cluster: ${reconnectUrl}`);
                connect(reconnectUrl);
            }
        });

        twitchWs.on("error", (err) => {
            console.error("❌ Twitch WebSocket error:", err);
        });

        twitchWs.on("close", (code, reason) => {
            console.warn(`⚠️ Twitch WebSocket closed (Code: ${code}). Reason: ${reason}`);
        });

    }
    connect();
}

export async function createEventSub(sessionId, type, version, broadcasterId) {

    userAccessToken = await getUserAccessToken();

    try {
        const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${userAccessToken}`,
                "Client-Id": process.env.TWITCH_CLIENT_ID,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: type,
                version: version,
                condition: { broadcaster_user_id: broadcasterId, },
                transport: {
                    method: "websocket",
                    session_id: sessionId,
                },
            }),
        });

        if (response.status === 202) {
            console.log(`Subscribed to '${type}' for broadcaster ID: ${broadcasterId}`);
            return true;
        } else {
            const errData = await response.json();
            console.error(`Twitch API Subscription Rejected (${response.status}):`, errData);
            return false;
        }

    } catch (error) {
        console.error(`API request failed for broadcaster ${broadcasterId}`, error)
        return false;
    }
}

async function handleEvent(client, db, type, event) {
    try {
        const streamConfig = await db.collection("twitch_channels").findOne({ broadcaster_id: event.broadcaster_user_id });
        if (!streamConfig) return;

        const targetChannel = await client.channels.fetch(streamConfig.discord_channel_id);
        if (!targetChannel) return;

        const streamerName = event.broadcaster_user_name;


        if (type === "stream.online") {

            const streamArray = await getStream(event.broadcaster_user_id);
            const streamData = streamArray[0];
            console.log(streamData);

            const title = streamData?.title || "Stream Title";
            const gameName = streamData?.game_name || "something";

            const embed = new EmbedBuilder()
                .setAuthor({ name: `🔴 ${streamerName} is now LIVE!` })
                .setTitle(title)
                .setURL(`https://twitch.tv/${event.broadcaster_user_login}`)
                .setColor("#6441a5")
                .setDescription(`**${streamerName}** just started broadcasting ${gameName}!`)
                .setTimestamp(new Date(event.started_at));

            const linkButton = new ButtonBuilder()
                .setLabel(`Watch Stream Now`)
                .setURL(`https://twitch.tv/${event.broadcaster_user_login}`)
                .setStyle(ButtonStyle.Link);

            const actionButton = new ButtonBuilder()
                .setLabel(`🙌 Notify me`)
                .setCustomId('disabled')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true);

            const actionRow = new ActionRowBuilder()
                .addComponents(linkButton, actionButton)

            await targetChannel.send({
                embeds: [embed],
                components: [actionRow]
            });
        }

        else if (type === "stream.offline") {
            await targetChannel.send(`\`💤\` **\`${streamerName}\`** \`is now offline.\``);
        }
    } catch (err) {
        console.error("❌ Failed to process incoming Twitch message event:", err);
    }
}

async function getStream(broadcaster_id) {
    userAccessToken = await getUserAccessToken();

    const response = await fetch(`https://api.twitch.tv/helix/streams?user_id=${broadcaster_id}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${userAccessToken}`,
            "Client-Id": process.env.TWITCH_CLIENT_ID,
        },
    })
    if (!response.ok) {
        throw new Error(`Twitch API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json.data;
}