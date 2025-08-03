import { Client, GatewayIntentBits, Collection, Events } from "discord.js";
import { config } from "dotenv";
import connectToDatabase from "./db.js";
import fs from "node:fs";
import { getOrCreateUser } from "./utils/getOrCreateUser.js";
import { getCurrentPST, getResetTimePST } from "./utils/formatTime.js";
import { formatReminder } from "./utils/formatReminder.js";
import { formatHelpText } from "./utils/formatLabels.js";

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

client.commands = new Collection();
client.buttons = new Collection();
client.modalSubmissions = new Collection();
client.buttonHandlersByPrefix = [];
client.modalHandlersByPrefix = [];

const buttonFiles = fs.readdirSync("./buttons").filter((file) => file.endsWith(".js"));
for (const file of buttonFiles) {
  const button = (await import(`./buttons/${file}`)).default;
  if (button?.prefix && typeof button.execute === "function") {
    client.buttonHandlersByPrefix.push(button);
  }
}

const modalFiles = fs.readdirSync("./modals").filter((file) => file.endsWith(".js"));
for (const file of modalFiles) {
  const modalHandler = (await import(`./modals/${file}`)).default;
  if (modalHandler?.prefix && typeof modalHandler.execute === "function") {
    client.modalHandlersByPrefix.push(modalHandler);
  }
}

const commandFiles = fs.readdirSync("./commands").filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  }
}
const baseDailyBonus = 100;
let db;

(async () => {
  db = await connectToDatabase();

  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    db = await connectToDatabase();
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!db) db = await connectToDatabase();
    const user = await getOrCreateUser(interaction.user, interaction.member);

    if (interaction.isButton()) {
      const matchedHandler = client.buttonHandlersByPrefix.find((handler) =>
        interaction.customId.startsWith(handler.prefix)
      );

      if (!matchedHandler) return;

      const value = interaction.customId.slice(matchedHandler.prefix.length); // grab suffix
      const tags = await db.collection("tags").find().toArray();

      try {
        await matchedHandler.execute(interaction, { db, user, tags, value });
      } catch (err) {
        console.error("Error executing button handler:", err);
        await interaction.reply({
          content: "`❌ There was an error.`",
          ephemeral: true,
        });
      }
    }

    if (interaction.isModalSubmit()) {
      const matchedHandler = client.modalHandlersByPrefix.find((handler) =>
        interaction.customId.startsWith(handler.prefix)
      );

      if (!matchedHandler) return;

      const value = interaction.customId.slice(matchedHandler.prefix.length); // grab suffix

      try {
        await matchedHandler.execute(interaction, { db, user, value });
      } catch (err) {
        console.error("Error executing modal handler:", err);
        await interaction.reply({
          content: "`❌ There was an error.`",
          ephemeral: true,
        });
      }
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error("`❌ Error executing command:`", error);
        await interaction.reply({
          content: "There was an error!",
        });
      }

      // daily bonus constants
      const users = db.collection("users");
      const missions = db.collection("missions");
      const lastClaim = user.last_daily_bonus ? new Date(user.last_daily_bonus) : null;
      const resetTime = getResetTimePST();

      // TODO: look at this -- daily bonus logic can still be used for one time daily rewards that reset like the garden

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

        await interaction.followUp({
          content: `## \`✨\` *\`Daily Login Bonus!\`* \`✨\`
      ||\`🔥 +${bonus} PPts \`||  \`🌊 Energy Restored!\`
      *\`‼️ ${resetDailyMissions.modifiedCount} New Daily Missions Available\`*${helpText}`,
        });
      }
    }
  });

  await client.login(process.env.BOT_TOKEN);
})();

setInterval(async () => {
  if (!db) db = await connectToDatabase();
  const now = getCurrentPST();
  const reminders = await db
    .collection("reminders")
    .find({
      remind_at: { $lte: now },
      sent: false,
    })
    .toArray();

  for (const reminder of reminders) {
    try {
      let channel;
      try {
        channel = await client.channels.fetch(reminder.channel_id);
      } catch (err) {
        // If channel fetch fails (e.g. Missing Access), we'll fall back to DM
        console.warn(`Channel not accessible for reminder ${reminder._id}, falling back to DM`);
      }

      const content = `<@${reminder.user_id}> \`You have a reminder!\` \n> ${formatReminder(reminder)}`;

      if (channel) {
        await channel.send({ content });
      } else {
        const user = await client.users.fetch(reminder.user_id);
        await user.send({ content });
      }

      await db.collection("reminders").updateOne({ _id: reminder._id }, { $set: { sent: true } });
    } catch (err) {
      console.error("❌ Failed to send reminder:", err);
    }
  }

  //   const currentHour = now.hour;
  //   const currentDate = now.toISODate();

  //   const usersNeedingSummary = await db
  //     .collection("users")
  //     .find({
  //       daily_reset_hour: currentHour,
  //       $or: [
  //         { last_summary_sent_at: { $exists: false } },
  //         {
  //           last_summary_sent_at: {
  //             $lt: new Date(now.startOf("day").toISO()),
  //           },
  //         },
  //       ],
  //     })
  //     .toArray();

  //   for (const user of usersNeedingSummary) {
  //     try {
  //       const missions = await db
  //         .collection("missions")
  //         .find({
  //           user_id: user._id,
  //           created_at: {
  //             $gte: new Date(now.minus({ days: 1 }).startOf("day").toISO()),
  //             $lt: new Date(now.startOf("day").toISO()),
  //           },
  //         })
  //         .toArray();

  //       const completed = missions.filter((m) => m.is_complete).length;
  //       const incomplete = missions.filter((m) => !m.is_complete).length;
  //       const earnedPPts = user.ppts_earned_yesterday ?? 0;

  //       const summary = `## \`📋 Daily Summary for ${now.minus({ days: 1 }).toFormat("MMMM dd")}\`
  // - ✅ ${completed} missions completed
  // - ❌ ${incomplete} missions left unfinished
  // - 🧠 Mood: \`${user.mood || "Unknown"}\`
  // - 🔋 Energy: \`${user.energy ?? "?"}\`
  // - 🔥 You earned \`+${earnedPPts} PPts\`

  // Keep going—you’re doing great!`;

  //       const discordUser = await client.users.fetch(user._id.toString());
  //       await discordUser.send({ content: summary });

  //       await db.collection("users").updateOne(
  //         { _id: user._id },
  //         {
  //           $set: { last_summary_sent_at: new Date() },
  //         }
  //       );
  //     } catch (err) {
  //       console.error("❌ Failed to send daily summary:", err);
  //     }
  //   }
}, 60 * 1000);
