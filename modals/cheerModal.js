import { LabelBuilder, ModalBuilder, TextDisplayBuilder, TextInputBuilder } from "@discordjs/builders";
import { MessageFlags, TextInputStyle } from "discord.js";
import { ObjectId } from "mongodb";
import { formatMission } from "../utils/formatter.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { DateTime, Duration } from "luxon";

const placeholders = [
  "You got this!", // default
  "Meow.",
];

export function getCheerModal(userToCheer = "a friend", missionId, cheerStatus) {
  const modal = new ModalBuilder()
    .setCustomId(`cheer_modal_submit:${missionId}`)
    .setTitle(`Cheer for ${userToCheer} 🎉`);

  const placeholder =
    Math.random() < 0.5 ? placeholders[0] : placeholders[Math.floor(Math.random() * (placeholders.length - 1)) + 1];
  const nextRefillUnix = Math.floor(cheerStatus.nextRefillAt.toSeconds());

  const textDescription = new TextDisplayBuilder().setContent(
    `Cheer for this mission? You have \`${cheerStatus.currentBalance}\` cheer(s).\n-# ${userToCheer} will receive double the rewards on completion.\n-# Your next cheer refills <t:${nextRefillUnix}:R>`
  );
  const messageInput = new TextInputBuilder()
    .setCustomId("cheer_input_message")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(placeholder)
    .setRequired(false);

  const messageLabel = new LabelBuilder().setLabel("Add a message").setTextInputComponent(messageInput);

  modal.addTextDisplayComponents(textDescription).addLabelComponents(messageLabel);
  return modal;
}

export default {
  prefix: "cheer_modal_submit",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");
    const users = db.collection("users");

    let [_, missionId] = interaction.customId.split(":");
    missionId = ObjectId.createFromHexString(missionId);
    const mission = await missions.findOne({
      _id: missionId,
      locked_in_at: { $ne: null },
    });

    if (!mission) {
      return interaction.reply({
        content: "> `❌ Mission not found or not locked in.`",
        ephemeral: true,
      });
    }

    const alreadyCheered = mission.cheers?.includes(user._id);
    if (alreadyCheered) {
      return interaction.reply({
        content: "> `❌ You already cheered for this mission.`",
        ephemeral: true,
      });
    }

    const cheerStatus = await getCheerStatus(user, db);
    if (cheerStatus.currentBalance <= 0) {
      return interaction.reply({
        content: `> \`❌ You are out of cheers!\``,
        ephemeral: true,
      });
    }

    const message = interaction.fields.getTextInputValue("cheer_input_message")?.trim() || "You got this!";

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          ppts: user.ppts - 100,
          cheer_balance: cheerStatus.currentBalance - 1,
          last_cheered_at: cheerStatus.lastAppliedRefill.toJSDate(),
        },
      }
    );
    await missions.updateOne({ _id: missionId }, { $addToSet: { cheers: user._id } });

    const text = new TextDisplayBuilder().setContent(
      `\`🗨️\` \`${message}\`
> \`${user.display_name} cheered for\` ${formatMission(mission)}`
    );
    await interaction.reply({
      components: [text],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

const MAX_CHEERS = 3;
const REFILL_RATE = Duration.fromObject({ hours: 8 });

export async function getCheerStatus(user) {
  const now = getCurrentPST();
  const refillMs = REFILL_RATE.as("milliseconds");

  const fallbackTime = now.minus(refillMs * MAX_CHEERS);

  const lastUpdate = user.last_cheered_at ? DateTime.fromJSDate(user.last_cheered_at) : fallbackTime;

  const diffMs = now.diff(lastUpdate).as("milliseconds");

  const regenerated = Math.floor(diffMs / refillMs);
  const currentBalance = Math.min(MAX_CHEERS, (user.cheer_balance || 0) + regenerated);

  const appliedRefillMs = regenerated * refillMs;
  const lastAppliedRefill = lastUpdate.plus({ milliseconds: appliedRefillMs });

  const msToNext = refillMs - (diffMs % refillMs);
  const nextRefillAt = now.plus({ milliseconds: msToNext });

  return {
    currentBalance,
    lastAppliedRefill,
    nextRefillAt,
    now,
  };
}
