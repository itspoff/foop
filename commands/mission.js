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

  // mission add
  if (sub === "add") {
    const code = await generateUniqueCode(missions);
    const name = interaction.options.getString("name").toLowerCase();

    await missions.insertOne({
      user_id: user._id,
      code,
      name,
      is_complete: false,
      time_taken: null,
      locked_in_at: null,
      attempts: 0,
      is_daily: false,
      is_system: false,
    });

    const mission = await missions.findOne({ code });

    const userMissions = await missions
      .find({ user_id: user._id })
      .sort({ created_at: -1 })
      .toArray();

    const completedMissions = await missions
      .find({
        user_id: user._id,
        is_complete: true,
      })
      .toArray();

    const displayMissions = userMissions
      .map((m) => {
        if (m._id.equals(mission._id)) {
          return `${formatDisplayMission(m)} \`✨️ New!\``;
        } else {
          return formatDisplayMission(m);
        }
      })
      .join("\n");

    const msg = `### \`Today's Missions:\` \`${completedMissions.length} / ${userMissions.length}\`
${displayMissions}`;

    await interaction.followUp({
      content: msg,
    });
  }

  // mission lockin
  if (sub === "lockin") {
    const code = interaction.options.getString("code");
    const mission = await missions.findOne({ code });

    if (!/^\d{4}$/.test(code)) {
      return interaction.followUp({
        content:
          "❌ Please enter a valid **4-digit number code** (e.g., 1234).",
      });
    }

    if (mission.is_complete) {
      return interaction.followUp({
        content: `mission [${capitalizeFirstLetter(
          mission.name
        )}] is already complete.`,
      });
    }

    await missions.updateOne(
      { _id: mission._id },
      {
        $set: { locked_in_at: new Date() },
        $inc: { attempts: 1 },
      }
    );

    const userMissions = await missions
      .find({ user_id: user._id })
      .sort({ created_at: -1 })
      .toArray();

    const completedMissions = await missions
      .find({
        user_id: user._id,
        is_complete: true,
      })
      .toArray();

    const displayMissions = userMissions
      .map((m) => {
        if (m._id.equals(mission._id)) {
          return `${formatDisplayMission(m)} \`🔐 Locked In!\``;
        } else {
          return formatDisplayMission(m);
        }
      })
      .join("\n");

    const msg = `### \`Today's Missions:\` \`${completedMissions.length} / ${userMissions.length}\`
${displayMissions}`;

    await interaction.followUp({
      content: msg,
    });
  }

  // mission complete
  if (sub === "complete") {
    const code = interaction.options.getString("code");
    const mission = await missions.findOne({ code });

    if (!/^\d{4}$/.test(code)) {
      return interaction.followUp({
        content:
          "❌ Please enter a valid **4-digit number code** (e.g., 1234).",
      });
    }
    if (mission.is_complete) {
      return interaction.followUp({
        content: `mission [${capitalizeFirstLetter(
          mission.name
        )}] is already complete.`,
      });
    }

    const now = new Date();
    let timeTaken = null;

    if (mission.locked_in_at) {
      timeTaken = Math.floor((now - new Date(mission.locked_in_at)) / 1000);
    }

    await missions.updateOne(
      { _id: mission._id },
      {
        $set: {
          is_complete: true,
          time_taken: timeTaken,
        },
      }
    );

    const userMissions = await missions
      .find({ user_id: user._id })
      .sort({ created_at: -1 })
      .toArray();

    const completedMissions = await missions
      .find({
        user_id: user._id,
        is_complete: true,
      })
      .toArray();

    const displayMissions = userMissions
      .map((m) => {
        if (m._id.equals(mission._id)) {
          return `${formatDisplayMission(m)} \`🐾 Completed!\``;
        } else {
          return formatDisplayMission(m);
        }
      })
      .join("\n");

    const msg = `### \`Today's Missions:\` \`${completedMissions.length} / ${userMissions.length}\`
${displayMissions}`;

    await interaction.followUp({ content: msg });
  }

  // mission delete
  if (sub === "delete") {
    const code = interaction.options.getString("code");

    if (!/^\d{4}$/.test(code)) {
      return interaction.followUp({
        content:
          "❌ Please enter a valid **4-digit number code** (e.g., 1234).",
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

    if (!mission.user_id.equals(user._id)) {
      return interaction.followUp({
        content: "❌ You don't have permission to delete this mission.",
      });
    }

    await missions.deleteOne({ _id: mission._id });

    return interaction.followUp({
      content: `🗑️ Mission \`${capitalizeFirstLetter(
        mission.name
      )}\` has been deleted.`,
    });
  }

  // mission clear
  if (sub === "clear") {
    const result = await missions.deleteMany({
      user_id: user._id,
      is_complete: true,
      is_daily: false,
      is_system: false,
    });

    await interaction.followUp({
      content: `\`🧹 Cleared ${result.deletedCount} completed non-daily mission(s).\``,
    });
  }
}
