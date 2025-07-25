import connectToDatabase from "../db.js";
import { generateUniqueCode } from "../utils/generateUniqueCode.js";

export async function getOrCreateUser(discordUser, guildMember = null) {
  const db = await connectToDatabase();
  const missions = db.collection("missions");
  const users = db.collection("users");

  const userId = discordUser.id;
  const display_name = guildMember?.nickname || discordUser.global_name || discordUser.username;

  let user = await users.findOne({ _id: userId });

  const now = new Date();

  if (!user) {
    const newUser = {
      _id: userId,
      discord_id: userId,
      display_name,
      date_created: now,
      last_updated: now,
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
      is_complete: false,
      time_taken: null,
      locked_in_at: null,
      attempts: 0,
      is_daily: true,
      is_system: true,
    });
  }

  const cleanedConditions = (user.conditions || []).filter((c) => new Date(c.expires_at) > now);

  if (cleanedConditions.length !== (user.conditions || []).length) {
    await users.updateOne({ _id: user._id }, { $set: { conditions: cleanedConditions, last_updated: now } });
    user.conditions = cleanedConditions;
  }

  return user;
}
