import { SlashCommandBuilder, InteractionContextType } from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import { generateUniqueCode } from "../utils/generateUniqueCode.js";
import { capitalizeFirstLetter, formatHelpText, formatMission, showMissionList } from "../utils/formatLabels.js";
import { formatTime } from "../utils/formatTime.js";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";

export const data = new SlashCommandBuilder()
  .setName("mission")
  .setDescription("Manage your missions")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add a new mission.")
      .addStringOption((opt) => opt.setName("name").setDescription("Mission name").setRequired(true))
      .addBooleanOption((opt) =>
        opt.setName("daily").setDescription("Set the mission to repeat daily").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("lockin")
      .setDescription("Lock in on a mission by code.")
      .addStringOption((opt) => opt.setName("code").setDescription("The 4-digit mission code").setRequired(true))
  )
  .addSubcommand((sub) => sub.setName("checkout").setDescription("Check out on the current mission."))
  .addSubcommand((sub) =>
    sub
      .setName("complete")
      .setDescription("Complete a mission.")
      .addStringOption((opt) => opt.setName("code").setDescription("The 4-digit mission code").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("delete")
      .setDescription("Delete a mission by code.")
      .addStringOption((opt) => opt.setName("code").setDescription("The 4-digit mission code").setRequired(true))
  )
  .addSubcommand((sub) => sub.setName("clear").setDescription("Clear completed non-daily missions"));

export async function execute(interaction) {
  const db = await connectToDatabase();
  const missions = db.collection("missions");
  const user = await getOrCreateUser(interaction.user, interaction.member);
  const sub = interaction.options.getSubcommand();

  const handlers = {
    add: () => handleAdd(interaction, user, missions),
    lockin: () => handleLockin(interaction, user, missions),
    checkout: () => handleCheckout(interaction, user, missions),
    complete: () => handleComplete(interaction, user, missions),
    delete: () => handleDelete(interaction, user, missions),
    clear: () => handleClear(interaction, user, missions),
  };

  if (handlers[sub]) {
    return handlers[sub]();
  }

  return interaction.followUp({ content: "Unknown subcommand." });
}

async function handleAdd(interaction, user, missions) {
  const code = await generateUniqueCode(missions);
  const name = interaction.options.getString("name").toLowerCase();
  const is_daily = interaction.options.getBoolean("daily") ?? false;
  const mission = {
    user_id: user._id,
    code,
    name,
    is_complete: false,
    time_taken: null,
    locked_in_at: null,
    attempts: 0,
    is_daily,
    is_system: false,
  };

  await missions.insertOne(mission);
  const helpText = formatHelpText("use /mission lockin " + code + " to start working on this mission.");

  return interaction.followUp({
    content: "`Added new mission:` `⭕️` " + formatMission(mission) + helpText,
  });
}

async function handleLockin(interaction, user, missions) {
  // TODO: can only lock in on one task at a time
  const code = interaction.options.getString("code");

  if (!/^\d{4}$/i.test(code)) {
    return interaction.followUp({
      content: "❌ Use a valid **4-digit number code** (e.g., 1234).",
    });
  }

  const mission = await missions.findOne({ code, user_id: user._id });
  if (!mission) return interaction.followUp({ content: "❌ Mission not found." });
  if (mission.is_complete)
    return interaction.followUp({
      content: `✅ Mission [${capitalizeFirstLetter(mission.name)}] already complete.`,
    });

  await missions.updateOne({ _id: mission._id }, { $set: { locked_in_at: new Date() }, $inc: { attempts: 1 } });
  const helpText = formatHelpText("use /mission checkout at any time to take a break.");

  return interaction.followUp({
    content: "`Locked in on:` `🔐` " + formatMission(mission) + helpText,
  });
}

async function handleCheckout(interaction, user, missions) {
  const mission = await missions.findOne({
    user_id: user._id,
    locked_in_at: { $ne: null },
    is_complete: { $ne: true },
  });

  if (!mission) {
    return interaction.followUp({
      content: "`❌ No active locked-in mission to check out from.`",
    });
  }

  const totalTime = calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken);
  const sessionTime = Math.floor((new Date() - new Date(mission.locked_in_at)) / 1000); // in seconds

  await missions.updateOne(
    { _id: mission._id },
    {
      $set: {
        time_taken: totalTime,
        locked_in_at: null,
      },
    }
  );

  return interaction.followUp({
    content:
      "`Checked out on:` `⭕️` " +
      formatMission(mission) +
      " `⏱️ " +
      formatTime(totalTime) +
      " (+" +
      formatTime(sessionTime) +
      ")`",
  });
}

async function handleComplete(interaction, user, missions) {
  const code = interaction.options.getString("code");

  if (!/^\d{4}$/.test(code)) {
    return interaction.followUp({
      content: "`❌ Use a valid **4-digit number code** (e.g., 1234).`",
    });
  }

  const mission = await missions.findOne({ code, user_id: user._id });
  if (!mission) return interaction.followUp({ content: "❌ Mission not found." });
  if (mission.is_complete)
    return interaction.followUp({
      content: `\`✅\` \`Mission ${formatMission(mission.name)} is already complete.`,
    });

  const totalTime = calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken);

  await missions.updateOne(
    { _id: mission._id },
    {
      $set: { is_complete: true, locked_in_at: null, time_taken: totalTime },
    }
  );

  return showMissionList(interaction, user, missions, mission.code, `🐾 Completed in ⏱️ ${formatTime(totalTime)}!`);
}

async function handleDelete(interaction, user, missions) {
  const code = interaction.options.getString("code");

  if (!/^\d{4}$/.test(code)) {
    return interaction.followUp({
      content: "`❌ Use a valid **4-digit number code** (e.g., 1234).`",
    });
  }

  const mission = await missions.findOne({ code });
  if (!mission) {
    return interaction.followUp({
      content: `\`❌ No mission found with code **${code}**.\``,
    });
  }
  if (mission.is_system) {
    return interaction.followUp({
      content: "`⚠️ You can't delete a system mission.`",
    });
  }
  if (!mission.user_id === user._id) {
    return interaction.followUp({
      content: "`❌ You don't have permission to delete this mission.`",
    });
  }

  await missions.deleteOne({ _id: mission._id });

  return interaction.followUp({
    content: `\`Mission\` \`🗑️\` \`${capitalizeFirstLetter(mission.name)}\` \`has been deleted.\``,
  });
}

async function handleClear(interaction, user, missions) {
  const result = await missions.deleteMany({
    user_id: user._id,
    is_complete: true,
    is_daily: false,
    is_system: false,
  });
  return interaction.followUp({
    content: `\`🧹 Cleared ${result.deletedCount} completed non-daily mission(s).\``,
  });
}
