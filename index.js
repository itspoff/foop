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
import fs from "node:fs";
import { DateTime } from "luxon";

import connectToDatabase from "./db.js";
import { getOrCreateUser } from "./utils/getOrCreateUser.js";
import { getCurrentPST, getResetTimePST } from "./utils/formatTime.js";
import { formatReminder } from "./utils/formatReminder.js";
import { getDailyReport } from "./components/dailyReport.js";
import { getDailyButtonRow } from "./components/buttonRows.js";
import { calculateLevelUp } from "./utils/missionRewards.js";

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

client.commands = new Collection();
client.buttonHandlersByPrefix = [];
client.modalHandlersByPrefix = [];
client.selectHandlersByPrefix = [];

const baseDailyBonus = 100;
let db;

async function loadHandlers(dir, targetArray) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const handler = (await import(`${dir}/${file}`)).default;
    if (handler?.prefix && typeof handler.execute === "function") {
      targetArray.push(handler);
    }
  }
}

async function loadCommands() {
  const files = fs.readdirSync("./commands").filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const command = await import(`./commands/${file}`);
    if (command?.data && command?.execute) {
      client.commands.set(command.data.name, command);
    }
  }
}

async function safeExecute(interaction, fn) {
  try {
    await fn();
  } catch (err) {
    console.error("❌ Interaction error:", err);
    if (!interaction.replied) {
      await interaction.reply({ content: "`❌ There was an error.`", ephemeral: true });
    }
  }
}

function findHandlerByPrefix(handlers, customId) {
  return handlers.find((h) => customId.startsWith(h.prefix));
}

(async () => {
  db = await connectToDatabase();

  await loadHandlers("./buttons", client.buttonHandlersByPrefix);
  await loadHandlers("./modals", client.modalHandlersByPrefix);
  await loadHandlers("./selects", client.selectHandlersByPrefix);
  await loadCommands();

  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!db) db = await connectToDatabase();
    const user = await getOrCreateUser(interaction.user, interaction.member);

    if (interaction.isButton()) {
      const handler = findHandlerByPrefix(client.buttonHandlersByPrefix, interaction.customId);
      if (!handler) return;

      const value = interaction.customId.slice(handler.prefix.length);
      const tags = await db.collection("tags").find().toArray();

      return safeExecute(interaction, () => handler.execute(interaction, { db, user, tags, value }));
    }

    if (interaction.isModalSubmit()) {
      const handler = findHandlerByPrefix(client.modalHandlersByPrefix, interaction.customId);
      if (!handler) return;

      const value = interaction.customId.slice(handler.prefix.length);

      return safeExecute(interaction, () => handler.execute(interaction, { db, user, value }));
    }

    if (interaction.isStringSelectMenu()) {
      const handler = findHandlerByPrefix(client.selectHandlersByPrefix, interaction.customId);
      if (!handler) return;

      const value = interaction.customId.slice(handler.prefix.length);

      return safeExecute(interaction, () => handler.execute(interaction, { db, user, value }));
    }

    if (interaction.isUserContextMenuCommand() || interaction.isMessageContextMenuCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      return safeExecute(interaction, () => command.execute(interaction, db));
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    await safeExecute(interaction, () => command.execute(interaction, db));

    const usersCol = db.collection("users");
    const missionsCol = db.collection("missions");

    const lastClaim = user.last_daily_bonus ? new Date(user.last_daily_bonus) : null;
    const resetTime = getResetTimePST(user.daily_reset_hour ?? 0);

    if (!lastClaim || lastClaim < resetTime) {
      const bonus = baseDailyBonus + Math.floor(Math.random() * 101);

      await missionsCol.updateOne(
        { user_id: user._id, name: "daily login", is_system: true },
        { $set: { is_complete: true } }
      );

      await usersCol.updateOne(
        { _id: user._id },
        {
          $inc: { ppts: bonus },
          $set: { last_daily_bonus: getCurrentPST().toJSDate() },
        }
      );

      await interaction.followUp({
        content: `## \`✨ Daily Login Bonus ✨\`\n||\`🔥 +${bonus} PPts\`||`,
      });
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
      let channel = null;

      try {
        channel = await client.channels.fetch(reminder.channel_id);
      } catch {
        console.warn(`⚠️ Channel unavailable, DM fallback for ${reminder.user_id}`);
      }

      const content = `<@${reminder.user_id}> \`You have a reminder!\`\n> ${formatReminder(reminder)}`;

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

  const users = await db
    .collection("users")
    .find({
      daily_reset_hour: now.hour,
      $or: [{ last_daily_sent: { $lt: now.startOf("hour").toJSDate() } }, { last_daily_sent: { $exists: false } }],
    })
    .toArray();

  for (const user of users) {
    try {
      const discordUser = await client.users.fetch(user._id.toString());
      const missionsCol = db.collection("missions");

      const dailyMissions = await missionsCol.find({ user_id: user._id, is_daily: true }).toArray();
      const allMissions = await missionsCol.find({ user_id: user._id }).toArray();

      const dailyReport = getDailyReport(user, discordUser, dailyMissions, allMissions);

      const update = {
        $set: {
          energy: 100,
          mood: "normal",
          thought_bubble: null,
          last_updated: now.toJSDate(),
          last_daily_sent: now.toJSDate(),
          daily_streak: dailyReport.allDailiesCompleted ? (user.daily_streak ?? 0) + 1 : 0,
        },
      };

      await db.collection("users").updateOne({ _id: user._id }, update);

      for (const daily of dailyMissions) {
        const updateMission = {
          $set: {
            is_complete: false,
            locked_in_at: null,
            time_taken: null,
            ppts_gained: null,
            cheers: [],
            rewarded_all_dailies: false,
          },
          $inc: { count: 1 },
        };

        if (daily.is_complete) {
          const levelUp = calculateLevelUp(daily);
          updateMission.$set.level = levelUp.level;
          updateMission.$set.xp = levelUp.xp;
          updateMission.$inc.completed_count = 1;
        }

        await missionsCol.updateOne({ _id: daily._id }, updateMission);
      }

      await missionsCol.deleteMany({
        user_id: user._id,
        is_daily: false,
        is_complete: true,
      });

      const lastUpdated = user.last_updated ? DateTime.fromJSDate(user.last_updated) : null;
      if (lastUpdated && now.diff(lastUpdated, "hours").hours <= 24) {
        const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
        const buttons = getDailyButtonRow(discordUser);

        await discordUser.send({
          components: [dailyReport.section, separator, buttons],
          flags: [MessageFlags.IsComponentsV2],
        });
      } else {
        console.log(`⏭️ Skipped daily DM for ${user.display_name} (inactive)`);
      }
    } catch (err) {
      console.error(`❌ Daily reset failed for ${user._id}:`, err);
    }
  }
}, 60 * 1000);
