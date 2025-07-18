import { SlashCommandBuilder, InteractionContextType } from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import { generateUniqueCode } from "../utils/generateUniqueCode.js";
import {
  capitalizeFirstLetter,
  formatDisplayMission,
} from "../utils/formatLabels.js";

export const data = new SlashCommandBuilder()
  .setName("mission")
  .setDescription("Manage your missions")
  .setContexts([
    InteractionContextType.Guild,
    InteractionContextType.BotDM,
    InteractionContextType.PrivateChannel,
  ])
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add a new mission")
      .addStringOption((opt) =>
        opt.setName("name").setDescription("Mission name").setRequired(true)
      )
      .addBooleanOption((opt) =>
        opt
          .setName("daily")
          .setDescription("Set the mission to repeat daily")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("lockin")
      .setDescription("Start tracking time for a mission")
      .addStringOption((opt) =>
        opt
          .setName("code")
          .setDescription("The 4-digit mission code")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("complete")
      .setDescription("Complete a mission")
      .addStringOption((opt) =>
        opt
          .setName("code")
          .setDescription("The 4-digit mission code")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("delete")
      .setDescription("Delete a mission by code")
      .addStringOption((opt) =>
        opt
          .setName("code")
          .setDescription("The 4-digit mission code")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("clear").setDescription("Clear completed non-daily missions")
  );

export async function execute(interaction) {
  const db = await connectToDatabase();
  const missions = db.collection("missions");
  const user = await getOrCreateUser(interaction.user, interaction.member);
  const sub = interaction.options.getSubcommand();

  const handlers = {
    add: () => handleAdd(interaction, user, missions),
    lockin: () => handleLockin(interaction, user, missions),
    complete: () => handleComplete(interaction, user, missions),
    delete: () => handleDelete(interaction, user, missions),
    clear: () => handleClear(interaction, user, missions),
  };

  if (handlers[sub]) {
    return handlers[sub]();
  }

  return interaction.followUp({ content: "Unknown subcommand." });
}

async function showMissionList(
  interaction,
  user,
  missions,
  highlightCode = null,
  highlightText = ""
) {
  const all = await missions
    .find({ user_id: user._id })
    .sort({ created_at: -1 })
    .toArray();
  const completed = all.filter((m) => m.is_complete);

  const msg = all
    .map((m) => {
      const label = formatDisplayMission(m);
      if (m.code === highlightCode) return `${label} \`${highlightText}\``;
      return label;
    })
    .join("\n");

  return interaction.followUp({
    content: `### \`Today's Missions:\` \`${completed.length} / ${all.length}\`\n${msg}`,
  });
}

async function handleAdd(interaction, user, missions) {
  const code = await generateUniqueCode(missions);
  const name = interaction.options.getString("name").toLowerCase();
  const is_daily = interaction.options.getBoolean("daily") ?? false;

  await missions.insertOne({
    user_id: user._id,
    code,
    name,
    is_complete: false,
    time_taken: null,
    locked_in_at: null,
    attempts: 0,
    is_daily,
    is_system: false,
  });

  return showMissionList(interaction, user, missions, code, "✨️ New!");
}

async function handleLockin(interaction, user, missions) {
  const code = interaction.options.getString("code");

  if (!/^\d{4}$/i.test(code)) {
    return interaction.followUp({
      content: "❌ Use a valid **4-digit number code** (e.g., 1234).",
    });
  }

  const mission = await missions.findOne({ code, user_id: user._id });
  if (!mission)
    return interaction.followUp({ content: "❌ Mission not found." });
  if (mission.is_complete)
    return interaction.followUp({
      content: `✅ Mission [${capitalizeFirstLetter(
        mission.name
      )}] already complete.`,
    });

  await missions.updateOne(
    { _id: mission._id },
    { $set: { locked_in_at: new Date() }, $inc: { attempts: 1 } }
  );

  // TODO: unlockin logic

  return showMissionList(
    interaction,
    user,
    missions,
    mission.code,
    "🔐 Locked In!"
  );
}

async function handleComplete(interaction, user, missions) {
  const code = interaction.options.getString("code");

  if (!/^\d{4}$/.test(code)) {
    return interaction.followUp({
      content: "❌ Use a valid **4-digit number code** (e.g., 1234).",
    });
  }

  const mission = await missions.findOne({ code, user_id: user._id });
  if (!mission)
    return interaction.followUp({ content: "❌ Mission not found." });
  if (mission.is_complete)
    return interaction.followUp({
      content: `✅ Mission [${capitalizeFirstLetter(
        mission.name
      )}] already complete.`,
    });

  // gives difference between two dates in ms, then rounds down
  const now = new Date();
  const timeTaken = mission.locked_in_at
    ? Math.floor((now - new Date(mission.locked_in_at)) / 1000)
    : null;

  // TODO: unlockin on user side if task is locked in
  await missions.updateOne(
    { _id: mission._id },
    {
      $set: { is_complete: true, time_taken: timeTaken },
    }
  );

  return showMissionList(
    interaction,
    user,
    missions,
    mission.code,
    "🐾 Completed!"
  );
}

async function handleDelete(interaction, user, missions) {
  const code = interaction.options.getString("code");

  if (!/^\d{4}$/.test(code)) {
    return interaction.followUp({
      content: "❌ Use a valid **4-digit number code** (e.g., 1234).",
    });
  }

  const mission = await missions.findOne({ code });
  if (!mission) {
    return interaction.followUp({
      content: `❌ No mission found with code **${code}**.`,
    });
  }
  if (mission.is_system) {
    return interaction.followUp({
      content: "⚠️ You can't delete a system mission.",
    });
  }
  if (!mission.user_id === user._id) {
    return interaction.followUp({
      content: "❌ You don't have permission to delete this mission.",
    });
  }

  // TODO: also delete from user obj

  await missions.deleteOne({ _id: mission._id });

  return interaction.followUp({
    content: `🗑️ Mission \`${capitalizeFirstLetter(
      mission.name
    )}\` has been deleted.`,
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
    content: `🧹 Cleared \`${result.deletedCount}\` completed non-daily mission(s).`,
  });
}
