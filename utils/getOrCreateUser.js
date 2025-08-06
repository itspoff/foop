import connectToDatabase from "../db.js";
import { generateUniqueCode } from "../utils/generateUniqueCode.js";
import { getCurrentPST } from "./formatTime.js";

export async function getOrCreateUser(discordUser, guildMember = null) {
  const db = await connectToDatabase();
  const missions = db.collection("missions");
  const users = db.collection("users");

  const userId = discordUser.id;
  const display_name = guildMember?.nickname || discordUser.global_name || discordUser.username;

  let user = await users.findOne({ _id: userId });

  const now = getCurrentPST();

  if (!user) {
    const newUser = {
      _id: userId,
      discord_id: userId,
      display_name,
      display_avatar_url: discordUser.displayAvatarUrl(),
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

    const code = await generateUniqueCode(missions);

    await missions.insertOne({
      user_id: userId,
      code,
      name: "daily login",
      description: "Use me once every day!",
      date_created: now.toJSDate(),
      is_complete: false,
      is_daily: true,
      is_system: true,
      time_taken: null,
      locked_in_at: null,
      cheers: [],
      level: 1,
      xp: 0,
      max_level: 5,
    });
  }

  const cleanedConditions = (user.conditions || []).filter((c) => new Date(c.expires_at) > now);

  if (cleanedConditions.length !== (user.conditions || []).length) {
    await users.updateOne({ _id: user._id }, { $set: { conditions: cleanedConditions } });
    user.conditions = cleanedConditions;
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

  const now = new Date();

  // Clean expired conditions if needed
  const cleanedConditions = (user.conditions || []).filter((c) => new Date(c.expires_at) > now);

  if (cleanedConditions.length !== (user.conditions || []).length) {
    await users.updateOne({ _id: userId }, { $set: { conditions: cleanedConditions } });
    user.conditions = cleanedConditions;
  }

  return user;
}
