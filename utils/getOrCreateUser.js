import connectToDatabase from "../db.js";
import { getCurrentPST } from "./formatTime.js";

export async function getOrCreateUser(discordUser, guildMember = null) {
  const db = await connectToDatabase();
  const users = db.collection("users");

  const userId = discordUser.id;
  const display_name = guildMember?.nickname || discordUser.global_name || discordUser.username;

  let user = await users.findOne({ _id: userId });

  const now = getCurrentPST();
  const avatarURL = discordUser.display_avatar_url;

  if (!user) {
    const newUser = {
      _id: userId,
      discord_id: userId,
      display_name,
      display_avatar_url: avatarURL,
      thought_bubble: null,
      date_created: now.toJSDate(),
      last_updated: now.toJSDate(),
      daily_reset_hour: 5,
      mood: "normal",
      energy: 100,
      conditions: [],
      tags: [],
      active_tag: null,
      ppts: 0,
    };

    await users.insertOne(newUser);
    user = newUser;
    console.log(`Created new user: ${display_name}`);
  }

  return user;
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
