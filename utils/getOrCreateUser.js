import connectToDatabase from "../db.js";
import { formatMood } from "./formatter.js";
import { getCurrentPST } from "./formatTime.js";

export async function getOrCreateUser(discordUser, guildMember = null) {
  const db = await connectToDatabase();
  const users = db.collection("users");

  const userId = discordUser.id;
  const display_name = guildMember?.nickname || discordUser.global_name || discordUser.username;
  const avatarURL = discordUser.displayAvatarURL();
  const now = getCurrentPST().toJSDate();

  const result = await users.findOneAndUpdate(
    { _id: userId },
    {
      $set: {
        display_name,
        display_avatar_url: avatarURL,
        last_updated: now,
      },
      $setOnInsert: {
        discord_id: userId,
        thought_bubble: null,
        date_created: now,
        daily_reset_hour: 5,
        mood: "normal",
        energy: 100,
        conditions: [],
        tags: [],
        active_tag: null,
        ppts: 0,
        backpack: { items: [] },
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  return result;
}

export async function getExistingUserFromId(userId) {
  const db = await connectToDatabase();
  const users = db.collection("users");
  const user = await users.findOne({ _id: userId });

  if (!user) {
    console.log(`Invalid user`);
    return null;
  }

  return user;
}
