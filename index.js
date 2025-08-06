import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { config } from "dotenv";
import connectToDatabase from "./db.js";
import fs from "node:fs";
import { getOrCreateUser } from "./utils/getOrCreateUser.js";
import { getCurrentPST, getResetTimePST } from "./utils/formatTime.js";
import { formatReminder } from "./utils/formatReminder.js";
import { formatHelpText } from "./utils/formatLabels.js";
import { getDailyReport } from "./components/dailyReport.js";
import { getDailyButtonRow } from "./utils/buttonRows.js";

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

client.commands = new Collection();
client.buttons = new Collection();
client.modalSubmissions = new Collection();

client.buttonHandlersByPrefix = [];
client.modalHandlersByPrefix = [];
client.selectHandlersByPrefix = [];

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

const selectFiles = fs.readdirSync("./selects").filter((file) => file.endsWith(".js"));
for (const file of selectFiles) {
  const selectHandler = (await import(`./selects/${file}`)).default;
  if (selectHandler?.prefix && typeof selectHandler.execute === "function") {
    client.selectHandlersByPrefix.push(selectHandler);
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

      const value = interaction.customId.slice(matchedHandler.prefix.length);
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
    } else if (interaction.isModalSubmit()) {
      const matchedHandler = client.modalHandlersByPrefix.find((handler) =>
        interaction.customId.startsWith(handler.prefix)
      );

      if (!matchedHandler) return;

      const value = interaction.customId.slice(matchedHandler.prefix.length);

      try {
        await matchedHandler.execute(interaction, { db, user, value });
      } catch (err) {
        console.error("Error executing modal handler:", err);
        await interaction.reply({
          content: "`❌ There was an error.`",
          ephemeral: true,
        });
      }
    } else if (interaction.isStringSelectMenu()) {
      const matchedHandler = client.selectHandlersByPrefix.find((handler) =>
        interaction.customId.startsWith(handler.prefix)
      );

      if (!matchedHandler) return;

      const value = interaction.customId.slice(matchedHandler.prefix.length);

      try {
        await matchedHandler.execute(interaction, { db, user, value });
      } catch (err) {
        console.error("Error executing string select menu handler:", err);
        await interaction.reply({
          content: "`❌ There was an error.`",
          ephemeral: true,
        });
      }
    } else if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, db);
      } catch (error) {
        console.error("`❌ Error executing command:`", error);
        await interaction.reply({
          content: "There was an error!",
        });
      }

      // daily login
      const missions = db.collection("missions");
      const lastClaim = user.last_daily_bonus ? new Date(user.last_daily_bonus) : null;
      const resetTime = getResetTimePST();

      if (!lastClaim || lastClaim < resetTime) {
        console.log("Daily Login from:", user.display_name);
        const bonus = baseDailyBonus + Math.floor(Math.random() * 101);

        await missions.updateOne(
          { user_id: user._id, name: "daily login", is_system: true },
          {
            $set: {
              is_complete: true,
            },
          }
        );

        await interaction.followUp({
          content: `## \`✨\` *\`Daily Login Bonus!\`* \`✨\`
||\`🔥 +${bonus} PPts \`||`,
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
        console.warn(`Channel not accessible for user ${reminder.user_id}, falling back to DM`);
      }

      const content = `<@${reminder.user_id}> \`You have a reminder!\` \n> ${formatReminder(reminder)}`;

      if (channel) {
        await channel.send({ content });
      } else {
        const user = await client.users.fetch(reminder.user_id);
        await user.send({ content });
      }

      return db.collection("reminders").updateOne({ _id: reminder._id }, { $set: { sent: true } });
    } catch (err) {
      console.error("❌ Failed to send reminder:", err);
    }
  }
  const currentHour = now.hour;

  const users = await db
    .collection("users")
    .find({
      daily_reset_hour: currentHour,
      $or: [{ last_daily_sent: { $lt: now.startOf("day").toJSDate() } }, { last_daily_sent: { $exists: false } }],
    })
    .toArray();

  for (const user of users) {
    const users = await db.collection("users");
    const missions = await db.collection("missions");
    try {
      const discordUser = await client.users.fetch(user._id.toString());
      const dailyMissions = await missions.find({ user_id: user._id, is_daily: true }).toArray();
      const allMissions = await missions.find({ user_id: user._id, is_daily: true }).toArray();

      const dailyReport = getDailyReport(user, discordUser, dailyMissions, allMissions);

      const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
      const buttons = getDailyButtonRow(discordUser);
      await discordUser.send({
        components: [dailyReport.section, separator, buttons],
        flags: [MessageFlags.IsComponentsV2],
      });

      const userUpdate = {
        $set: {
          energy: 100,
          mood: "normal",
          thought_bubble: null,
          last_updated: now.toJSDate(),
          last_daily_sent: now.toJSDate(),
        },
      };
      if (dailyReport.allDailiesCompleted) {
        userUpdate.$inc = { daily_streak: 1 };
      } else {
        userUpdate.$set.daily_streak = 0;
      }

      await users.updateOne({ _id: user._id }, { update });

      const resetDailyMissions = await missions.updateMany(
        { user_id: user._id, is_daily: true },
        {
          $set: {
            is_complete: false,
            locked_in_at: null,
            time_taken: null,
            ppts_gained: null,
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
      console.log(`Sent daily message to ${user.display_name || user._id}`);
    } catch (err) {
      console.error(`❌ Failed to send daily message to ${user._id}:`, err);
    }
  }
}, 60 * 1000);
