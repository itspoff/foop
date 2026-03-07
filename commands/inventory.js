import {
  SlashCommandBuilder,
  InteractionContextType,
  MessageFlags,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ContainerBuilder,
} from "discord.js";
import { wrap } from "../utils/formatter.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";

export const data = new SlashCommandBuilder()
  .setName("backpack")
  .setDescription("Manage your items.")
  .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]);

export async function execute(interaction, db) {
  const message = await getBackpackPayload(interaction, db);

  return interaction.reply(message);
}

async function getBackpackPayload(interaction, db) {
  const itemsCollection = db.collection("items");

  const user = await getOrCreateUser(interaction.user);
  const emptyBackpack = {
    items: [],
  };
  const userBackpack = user.backpack || emptyBackpack;
  console.log(userBackpack);
  const displayAvatarURL = user.display_avatar_url;

  const backpack = [
    `## *${wrap("ITSPOFF'S BACKPACK  ")}*`,
    `> ${wrap("💮")} ${wrap("PPts:  ")} ${wrap(user.ppts)}`,
    `> ${wrap("📦")} ${wrap("Items: ")} ${wrap(userBackpack.items.length)}`,
  ].join("\n");

  const headerSection = new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(backpack))
    .setThumbnailAccessory(new ThumbnailBuilder().setDescription("Status").setURL(displayAvatarURL));

  const container = new ContainerBuilder().addSectionComponents(headerSection);

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}
