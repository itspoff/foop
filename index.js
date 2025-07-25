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

      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const parts = formatter.formatToParts(now);
      const year = parts.find((p) => p.type === "year").value;
      const month = parts.find((p) => p.type === "month").value;
      const day = parts.find((p) => p.type === "day").value;

      // Create a new Date at 3:00 AM PST
      const threeAMPST = new Date(`${year}-${month}-${day}T03:00:00-08:00`); // -08:00 = PST

      const nowPST = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
      if (nowPST.getHours() < 3) {
        threeAMPST.setUTCDate(threeAMPST.getUTCDate() - 1);
      }

      return threeAMPST;
    }

    const resetTime = getToday3amPST();

    if (!lastClaim || lastClaim < resetTime) {
      const bonus = baseDailyBonus + Math.floor(Math.random() * 101);
      await users.updateOne(
        { _id: user._id },
        {
          $inc: { ppts: bonus },
          $set: { energy: 100, mood: "normal", last_daily_bonus: new Date() },
        }
      );

      const resetDailyMissions = await missions.updateMany(
        { is_daily: true },
        {
          $set: {
            is_complete: false,
            time_taken: null,
            locked_in_at: null,
          },
        }
      );

      const clearCompletedMissions = await missions.deleteMany({
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
