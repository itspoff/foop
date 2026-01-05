import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { getMissionListDisplay } from "../utils/formatter.js";
import { ObjectId } from "mongodb";
import { processMissionCompletion, sendDailyBonusFollowUp } from "../logic/missionLogic.js";
import { formatMissionRewardMessage } from "../utils/missionRewards.js";

export default {
  prefix: "complete_modal_submit",

  async execute(interaction, { db, user }) {
    const missions = db.collection("missions");

    const selectedIds =
      interaction.fields.getStringSelectValues("complete_select")?.map((id) => ObjectId.createFromHexString(id)) || [];

    const selectedMissions = await missions
      .find({
        user_id: user._id,
        _id: { $in: selectedIds },
      })
      .toArray();

    const rewardMessages = [];
    let lastResult = null;

    for (const mission of selectedMissions) {
      const result = await processMissionCompletion(db, user, mission);
      lastResult = result;

      const rewardMessage = formatMissionRewardMessage({
        ...result.rewardData,
        mission,
        user: result.updatedUser,
        totalTime: result.totalTime,
        dailyBonus: result.dailyBonus,
      });
      rewardMessages.push(rewardMessage);

      user = result.updatedUser;
    }

    const missionListDisplay = await getMissionListDisplay(interaction, db);
    await interaction.update(missionListDisplay);

    await interaction.followUp({
      components: [new TextDisplayBuilder().setContent(rewardMessages.join("\n"))],
      flags: MessageFlags.IsComponentsV2,
    });

    if (lastResult?.completedAllDaily && lastResult?.dailyBonus > 0) {
      await sendDailyBonusFollowUp(interaction);
    }
    return;
  },
};
