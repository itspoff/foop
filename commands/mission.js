import {
  SlashCommandBuilder,
  InteractionContextType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SectionBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
  AttachmentBuilder,
} from "discord.js";
import connectToDatabase from "../db.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import { generateUniqueCode } from "../utils/generateUniqueCode.js";
import { capitalizeFirstLetter, formatHelpText, formatMission } from "../utils/formatLabels.js";
import { formatTime, getCurrentPST } from "../utils/formatTime.js";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";
import { getMissionButtonRow } from "../utils/buttonRows.js";
import { createNewMissionModal } from "../components/missionComponents.js";

export const data = new SlashCommandBuilder()
  .setName("mission")
  .setDescription("Manage your missions")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
  .addSubcommand((sub) => sub.setName("add").setDescription("Add a new mission."))
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
  const users = db.collection("users");
  const user = await getOrCreateUser(interaction.user, interaction.member);
  const sub = interaction.options.getSubcommand();

  const handlers = {
    add: () => handleAdd(interaction),
    lockin: () => handleLockin(interaction, user, missions),
    checkout: () => handleCheckout(interaction, user, missions),
    complete: () => handleComplete(interaction, user, missions, users),
    delete: () => handleDelete(interaction, user, missions),
    clear: () => handleClear(interaction, user, missions),
  };

  if (handlers[sub]) {
    return handlers[sub]();
  }

  return interaction.reply({ content: "`❌ Unknown subcommand.`" });
}

async function handleAdd(interaction) {
  const modal = createNewMissionModal();
  return interaction.showModal(modal);
}

async function handleLockin(interaction, user, missions) {
  const code = interaction.options.getString("code");

  if (!/^\d{4}$/.test(code)) {
    return interaction.reply({
      content: "> `❌ Invalid 4-digit number code (e.g., 1234).`",
      ephemeral: true,
    });
  }

  const mission = await missions.findOne({ code, user_id: user._id });
  if (!mission) return interaction.reply({ content: "> `❌ Mission not found.`" });
  if (mission.is_complete)
    return interaction.reply({
      content: `\`💦\` \`no!! you can't lock in on a completed task...\` \n> ${formatMission(
        mission
      )} \`is already complete.\``,
      ephemeral: true,
    });

  const alreadyLocked = await missions.findOne({
    user_id: user._id,
    locked_in_at: { $ne: null },
    is_complete: false,
  });

  if (alreadyLocked) {
    return interaction.reply({
      content: `\`⚠️ You are already locked in on:\` \`🔐\` ${formatMission(alreadyLocked)} ${formatHelpText(
        "use /mission checkout before locking in on a new mission."
      )}`,
      ephemeral: true,
    });
  }

  await missions.updateOne({ _id: mission._id }, { $set: { locked_in_at: new Date() } });

  const text = new TextDisplayBuilder().setContent("`Locked in on:` `🔐` " + formatMission(mission));

  const row = getMissionButtonRow(code, user._id, { disableLockIn: true, lockedInMission: true });

  return interaction.reply({
    components: [text, row],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleCheckout(interaction, user, missions) {
  const mission = await missions.findOne({
    user_id: user._id,
    locked_in_at: { $ne: null },
    is_complete: { $ne: true },
  });

  const msg = new TextDisplayBuilder().setContent("`🗨️` `can you lock the fuck in`\n> `Lock in on a mission first.`");
  const thumbnail = new ThumbnailBuilder().setDescription("poff").setURL("attachment://poff-icon.png");
  const lockInMessage = new SectionBuilder().addTextDisplayComponents(msg).setThumbnailAccessory(thumbnail);

  if (!mission) {
    const file = new AttachmentBuilder("assets/poff-icon.png", { name: "poff-icon.png" });
    return interaction.reply({
      components: [lockInMessage],
      flags: MessageFlags.IsComponentsV2,
      files: [file],
      ephemeral: true,
    });
  }

  const code = mission.code;

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

  const text = new TextDisplayBuilder().setContent(
    "`Checked out on:` `⭕️` " +
      formatMission(mission) +
      " `⏱️ " +
      formatTime(totalTime) +
      " (+" +
      formatTime(sessionTime) +
      ")`"
  );

  const row = getMissionButtonRow(code, user._id);

  return interaction.reply({
    components: [text, row],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleComplete(interaction, user, missions, users) {
  const code = interaction.options.getString("code");

  if (!/^\d{4}$/.test(code)) {
    return interaction.reply({
      content: "> `❌ Invalid 4-digit number code (e.g., 1234).`",
      ephemeral: true,
    });
  }

  const mission = await missions.findOne({ code, user_id: user._id });

  if (!mission) return interaction.reply({ content: "> `❌ Mission not found.`", ephemeral: true });

  if (mission.is_complete)
    return interaction.reply({
      content: `${formatMission(mission)} \` is already complete.\``,
      ephemeral: true,
    });

  var totalTime = 0;

  if (mission.locked_in_at) {
    totalTime = calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken);
  } else if (mission.time_taken) {
    totalTime = mission.time_taken;
  }

  await missions.updateOne(
    { _id: mission._id },
    {
      $set: { is_complete: true, locked_in_at: null, time_taken: totalTime },
    }
  );

  // check if this completes all daily missions

  const incompleteCount = await missions.countDocuments({
    user_id: user._id,
    is_daily: true,
    is_complete: { $ne: true },
  });

  const completedAllDaily = incompleteCount === 0;
  let dailyBonus = 0;
  if (completedAllDaily) {
    // check if any daily mission was already rewarded
    const alreadyRewarded = await missions.findOne({
      user_id: user._id,
      is_daily: true,
      rewarded_all_dailies: true,
    });
    if (!alreadyRewarded) {
      dailyBonus = 50;
      await users.updateOne(
        { _id: user._id },
        {
          $set: { last_updated: new Date() },
          $inc: { ppts: dailyBonus },
        }
      );

      await missions.updateOne({ _id: mission._id }, { $set: { rewarded_all_dailies: true } });
    }
  }

  // calculate user energy and ppts gain
  var bonus = 12 + Math.floor(Math.random() * 13);
  var cost = 10 + Math.floor(Math.random() * 11);
  if (user.energy - cost < 0) {
    cost = user.energy;
  }
  if (user.energy === 0) {
    cost = 0;
    bonus = 0;
  }
  const cheerCount = mission.cheers ? mission.cheers.length : 0;
  const totalBonus = Math.floor(bonus * (totalTime > 300 ? 1.35 : 1) * (cheerCount + 1) + dailyBonus);

  await users.updateOne(
    { _id: user._id },
    {
      $set: { last_updated: new Date() },
      $inc: { ppts: totalBonus, energy: -cost },
    }
  );

  const completeMissionMsg =
    totalTime === 0
      ? formatMission(mission) + " `🐾 Completed!`"
      : formatMission(mission) + " `🐾 Completed in ⏱️ " + formatTime(totalTime) + "!`";

  const bonusMessage =
    totalBonus > 0
      ? "\n" +
        `> -# \`Reward: ${bonus}\` ${totalTime > 300 ? "`🍵 Focused (x1.35)`" : ""} ${
          cheerCount > 0 ? `\`👏 Cheer (x${cheerCount + 1})\`` : ""
        } ${dailyBonus > 0 ? `\`🎯 All dailies complete! +${dailyBonus}\`` : ""} \n` +
        `> -# \`Energy: ${user.energy - cost}(-${cost})\` \`Ppts: ${user.ppts + totalBonus}(+${totalBonus})\``
      : "";

  const msg = completeMissionMsg + bonusMessage;

  const text = new TextDisplayBuilder().setContent(msg);
  const row = getMissionButtonRow(code, user._id, { disableLockIn: true, disableComplete: true, disableCheer: true });

  return interaction.reply({
    components: [text, row],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleDelete(interaction, user, missions) {
  const code = interaction.options.getString("code");

  if (!/^\d{4}$/.test(code)) {
    return interaction.reply({
      content: "> `❌ Use a valid 4-digit number code (e.g., 1234).`",
      ephemeral: true,
    });
  }

  const mission = await missions.findOne({ code });
  if (!mission) {
    return interaction.reply({
      content: `> \`❌ No mission found with code ${code}.\``,
      ephemeral: true,
    });
  }
  if (mission.is_system) {
    return interaction.reply({
      content: "> `⚠️ You can't delete a system mission.`",
      ephemeral: true,
    });
  }
  if (mission.user_id !== user._id) {
    return interaction.reply({
      content: "> `❌ You don't have permission to delete this mission.`",
      ephemeral: true,
    });
  }

  await missions.deleteOne({ _id: mission._id });

  const text = new TextDisplayBuilder().setContent(
    `\`Mission\` \`🗑️\` \`${capitalizeFirstLetter(mission.name)}\` \`has been deleted.\``
  );

  const row = getMissionButtonRow(code, user._id, {
    disableLockIn: true,
    disableComplete: true,
    disableDelete: true,
    disableCheer: true,
  });

  return interaction.reply({
    components: [text, row],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleClear(interaction, user, missions) {
  const result = await missions.deleteMany({
    user_id: user._id,
    is_complete: true,
    is_daily: false,
    is_system: false,
  });
  return interaction.reply({
    content: `\`🧹 Cleared ${result.deletedCount} completed non-daily mission(s).\``,
  });
}
