import { Client, GatewayIntentBits, Collection, Events } from "discord.js";
import { config } from "dotenv";
import connectToDatabase from "./db.js";
import fs from "node:fs";

config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

(async () => {
  await connectToDatabase();
  const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    }
  }

  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("❌ Error executing command:", error);
      await interaction.reply({
        content: "There was an error!",
        ephemeral: true,
      });
    }
  });

  await client.login(process.env.BOT_TOKEN);
})();
