import { Client, GatewayIntentBits, Collection, Events } from "discord.js";
import { config } from "dotenv";
import connectToDatabase from "./db.js";
import fs from "node:fs";
import { getOrCreateUser } from "./utils/getOrCreateUser.js";
import getRandomTag from "./utils/getRandomTag.js";
import { formatHelpText, formatPulledTag } from "./utils/formatLabels.js";
import { getResetTimePST } from "./utils/formatTime.js";

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

client.commands = new Collection();
client.buttons = new Collection();

const buttonFiles = fs.readdirSync("./buttons").filter((file) => file.endsWith(".js"));
for (const file of buttonFiles) {
  const button = (await import(`./buttons/${file}`)).default;
  if (button?.id) {
    const ids = Array.isArray(button.id) ? button.id : [button.id];
    for (const id of ids) {
      client.buttons.set(id, button);
    }
  }
}

const baseDailyBonus = 100;
let db;

(async () => {
  db = await connectToDatabase();
  const commandFiles = fs.readdirSync("./commands").filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    }
  }

  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    db = await connectToDatabase();
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!db) db = await connectToDatabase();
    if (interaction.isButton()) {
      const user = await getOrCreateUser(interaction.user, interaction.member);
      const tags = await db.collection("tags").find().toArray();

      const buttonHandler = client.buttons.get(interaction.customId);
      if (!buttonHandler) return;

      try {
        await buttonHandler.execute(interaction, { db, user, tags });
      } catch (err) {
        console.error("Error executing command:", err);
        await interaction.reply({
          content: "`❌ There was an error.`",
          ephemeral: true,
        });
      }
    }

    if (interaction.isChatInputCommand()) {
      const users = db.collection("users");
      const missions = db.collection("missions");

      const user = await getOrCreateUser(interaction.user, interaction.member);

      const lastClaim = user.last_daily_bonus ? new Date(user.last_daily_bonus) : null;
      const resetTime = getResetTimePST();

      if (!lastClaim || lastClaim < resetTime) {
        console.log("Daily Login from:", user.display_name);
        const bonus = baseDailyBonus + Math.floor(Math.random() * 101);
        await users.updateOne(
          { _id: user._id },
          {
            $inc: { ppts: bonus },
            $set: { energy: 100, mood: "normal", last_daily_bonus: new Date(), last_updated: new Date() },
          }
        );

        const resetDailyMissions = await missions.updateMany(
          { user_id: user._id, is_daily: true },
          {
            $set: {
              is_complete: false,
              time_taken: null,
              locked_in_at: null,
            },
          }
        );

        console.log("reset %d daily missions", resetDailyMissions.modifiedCount);

        const clearCompletedMissions = await missions.deleteMany({
          user_id: user._id,
          is_daily: false,
          is_complete: true,
        });

        console.log("removed %d completed missions", clearCompletedMissions.modifiedCount);

        await missions.updateOne(
          { user_id: user._id, name: "daily login" },
          {
            $set: {
              is_complete: true,
            },
          }
        );

        const helpText = formatHelpText("use /mission add to start the day!");

        await interaction.reply({
          content: `## \`✨\` *\`Daily Login Bonus!\`* \`✨\`
||\`🔥 +${bonus} PPts \`||  \`🌊 Energy Restored!\`
*\`‼️ ${resetDailyMissions.modifiedCount} New Daily Missions Available\`*${helpText}`,
        });
      } else {
        await interaction.deferReply();
      }

      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error("`❌ Error executing command:`", error);
        await interaction.followUp({
          content: "There was an error!",
        });
      }
    }
  });

  await client.login(process.env.BOT_TOKEN);
})();
