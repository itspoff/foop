import { Client, GatewayIntentBits, Collection, Events } from "discord.js";
import { config } from "dotenv";
import connectToDatabase from "./db.js";
import fs from "node:fs";
import { getOrCreateUser } from "./utils/getOrCreateUser.js";
import getRandomTag from "./utils/getRandomTag.js";
import { formatHelpText, formatPulledTag } from "./utils/formatLabels.js";
import { formatTime } from "./utils/formatTime.js";

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

client.commands = new Collection();

const baseDailyBonus = 100;
(async () => {
  await connectToDatabase();
  const commandFiles = fs.readdirSync("./commands").filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    }
  }

  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    const db = await connectToDatabase();
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    const db = await connectToDatabase();
    if (interaction.isButton()) {
      const users = db.collection("users");
      const user = await getOrCreateUser(interaction.user, interaction.member);

      const tags = await db.collection("tags").find().toArray();

      const cost = interaction.customId === "pull_1x" ? 100 : 1000;
      const pulls = interaction.customId === "pull_1x" ? 1 : 10;

      const pullsResult = Array.from({ length: pulls }, () => getRandomTag(tags));

      const tagCodes = pullsResult.map((tag) => tag.code);
      const ownedTagCodes = user.tags ?? [];
      const newTagCodes = tagCodes.filter((code) => !ownedTagCodes.includes(code));

      if (user.ppts < cost) {
        await interaction.reply({
          content: `\`⚠️ Not enough PPts.\``,
        });
        return;
      }

      await users.updateOne(
        { _id: user._id },
        {
          $set: { last_updated: new Date() },
          $inc: { ppts: -cost },
          $addToSet: { tags: { $each: newTagCodes } },
        }
      );

      await interaction.reply({
        content: `\`Pulled ${pulls} tag(s)!\` \`PPts remaining: ${user.ppts}\` \n\n${pullsResult
          .map((tag) => {
            const isNew = !ownedTagCodes.includes(tag.code);
            const label = formatPulledTag(tag);
            const rarity = tag.weight <= 10 ? " `🐾 Rare!`" : "";
            const novelty = isNew ? " `✨️ New!`" : "";
            return `${label}${rarity}${novelty}`;
          })
          .join("\n")}`,
      });
    }

    if (!interaction.isChatInputCommand()) return;

    const users = db.collection("users");
    const missions = db.collection("missions");

    const user = await getOrCreateUser(interaction.user, interaction.member);

    const lastClaim = user.last_daily_bonus ? new Date(user.last_daily_bonus) : null;

    function getToday3amPST() {
      const now = new Date();

      // get current date in PST/PDT
      const pstNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));

      // set to 3am
      pstNow.setHours(3, 0, 0, 0);

      // if current time is before 3am PST, use previous day 3am PST
      if (now.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }) < 3) {
        pstNow.setDate(pstNow.getDate() - 1);
      }

      return pstNow;
    }

    const resetTime = getToday3amPST();
    console.log(resetTime);
    console.log(lastClaim);

    if (!lastClaim || lastClaim < resetTime) {
      const bonus = baseDailyBonus + Math.floor(Math.random() * 101);
      await users.updateOne(
        { _id: user._id },
        {
          $inc: { ppts: bonus },
          $set: { energy: 100, mood: "normal", last_daily_bonus: new Date(), last_updated: new Date() },
        }
      );

      const resetDailyMissions = await missions.updateMany(
        { _id: user._id, is_daily: true },
        {
          $set: {
            is_complete: false,
            time_taken: null,
            locked_in_at: null,
          },
        }
      );

      const clearCompletedMissions = await missions.deleteMany({
        _id: user._id,
        is_daily: false,
        is_complete: true,
      });

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
  });

  await client.login(process.env.BOT_TOKEN);
})();
