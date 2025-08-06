import getRandomTag from "../utils/getRandomTag.js";
import { formatPulledTag } from "../utils/formatLabels.js";
import { getCurrentPST } from "../utils/formatTime.js";

export default {
  prefix: "pull_",

  async execute(interaction, { db, user, tags, value }) {
    const users = db.collection("users");

    const isSinglePull = value === "1x";
    const cost = isSinglePull ? 100 : 1000;
    const pulls = isSinglePull ? 1 : 10;

    if (user.ppts < cost) {
      await interaction.reply({
        content: "`⚠️ Not enough PPts.`",
        ephemeral: true,
      });
      return;
    }

    const pullsResult = Array.from({ length: pulls }, () => getRandomTag(tags));
    const tagCodes = pullsResult.map((tag) => tag.code);
    const ownedTagCodes = user.tags ?? [];
    const newTagCodes = tagCodes.filter((code) => !ownedTagCodes.includes(code));

    await users.updateOne(
      { _id: user._id },
      {
        $set: { last_updated: getCurrentPST().toJSDate() },
        $inc: { ppts: -cost },
        $addToSet: { tags: { $each: newTagCodes } },
      }
    );

    const updatedPPts = user.ppts - cost;

    const resultsText = pullsResult
      .map((tag) => {
        const isNew = !ownedTagCodes.includes(tag.code);
        const label = formatPulledTag(tag);
        const rarity = tag.weight <= 10 ? " `🐾 Rare!`" : "";
        const novelty = isNew ? " `✨️ New!`" : "";
        return `${label}${rarity}${novelty}`;
      })
      .join("\n");

    await interaction.reply({
      content: `\`Pulled ${pulls} tag(s)!\` \`PPts remaining: ${updatedPPts}\`\n\n${resultsText}`,
    });
  },
};
