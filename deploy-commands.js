import { REST, Routes } from "discord.js";
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "url";

config();

const commands = [];

/**
 * Recursively read all .js files from a directory and subdirectories
 */
function loadCommandFiles(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      loadCommandFiles(fullPath); // recurse into subdirectory
    } else if (file.endsWith(".js")) {
      commands.push(import(pathToFileURL(fullPath).href));
    }
  }
}

// Start walking from the commands root
loadCommandFiles("./commands");

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    const existingCommands = await rest.get(Routes.applicationCommands(process.env.APP_ID));
    for (const cmd of existingCommands) {
      await rest.delete(Routes.applicationCommand(process.env.APP_ID, cmd.id));
      console.log(`Deleted global command: ${cmd.name}`);
    }

    const resolved = await Promise.all(commands);
    const commandJSONs = resolved.filter((cmd) => "data" in cmd).map((cmd) => cmd.data.toJSON());

    console.log("Deploying the following commands:");
    console.table(commandJSONs.map((c) => ({ name: c.name, description: c.description })));

    // await rest.put(Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID), {
    //   body: commandJSONs,
    // });
    await rest.put(Routes.applicationCommands(process.env.APP_ID), {
      body: commandJSONs,
    });

    console.log("✅ Successfully reloaded all commands.");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
