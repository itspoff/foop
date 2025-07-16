import connectToDatabase from "../db.js";

export async function getOrCreateUser(discordUser, guildMember = null) {
  const db = await connectToDatabase();
  const users = db.collection("users");

  const userId = discordUser.id;
  const nickname =
    guildMember?.nickname || discordUser.global_name || discordUser.username;

  let user = await users.findOne({ _id: userId });

  if (!user) {
    const newUser = {
      _id: userId,
      discord_id: userId,
      nickname: nickname,
      date_created: new Date(),
      last_updated: new Date(),
      mood: "normal",
      energy: 100,
      conditions: [],
    };

    await users.insertOne(newUser);
    user = newUser;
    console.log(`Created new user: ${nickname}`);
  }

  return user;
}
