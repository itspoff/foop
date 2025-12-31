import { DateTime } from "luxon";
import { calculateTotalTimeTaken } from "../utils/calculateTotalTimeTaken.js";
import { getCurrentPST } from "../utils/formatTime.js";
import { calculateMissionRewards } from "../utils/missionRewards.js";

export async function processMissionCheckout(db, user, mission) {
  const totalTime = calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken);
  const sessionTime = Math.floor((Date.now() - new Date(mission.locked_in_at)) / 1000);

  await db
    .collection("missions")
    .updateOne({ _id: mission._id }, { $set: { time_taken: totalTime, locked_in_at: null } });

  return { totalTime, sessionTime };
}

export async function processMissionCompletion(db, user, mission) {
  const missions = db.collection("missions");
  const users = db.collection("users");

  const totalTime = mission.locked_in_at
    ? calculateTotalTimeTaken(mission.locked_in_at, mission.time_taken)
    : mission.time_taken || 0;

  let newStreak = mission.current_streak || 0;
  let highestStreak = mission.highest_streak || 0;

  if (mission.is_daily) {
    const lastComp = mission.completed_at
      ? DateTime.fromJSDate(mission.completed_at).setZone("America/Los_Angeles")
      : null;

    if (!lastComp) {
      newStreak = 1;
    } else {
      const diff = getCurrentPST().startOf("day").diff(lastComp.startOf("day"), "days").days;

      if (diff === 1) {
        newStreak += 1;
      } else if (diff > 1) {
        newStreak = 1;
      }
    }

    if (newStreak > highestStreak) highestStreak = newStreak;
  }

  const otherIncompleteDailies = await missions.countDocuments({
    user_id: user._id,
    is_daily: true,
    is_complete: false,
    _id: { $ne: mission._id },
  });

  const completedAllDaily = otherIncompleteDailies === 0;
  let dailyBonus = 0;

  if (completedAllDaily) {
    const alreadyRewarded = await missions.findOne({
      user_id: user._id,
      is_daily: true,
      rewarded_all_dailies: true,
    });
    if (!alreadyRewarded) dailyBonus = 50;
  }

  const rewardData = calculateMissionRewards({ mission, user, totalTime, dailyBonus });

  // DB Updates
  const missionUpdate = {
    $set: {
      is_complete: true,
      locked_in_at: null,
      time_taken: totalTime,
      completed_at: getCurrentPST().toJSDate(),
      ppts_gained: rewardData.totalBonus,
      ...(mission.is_daily && { current_streak: newStreak, highest_streak: highest_streak }),
      ...(completedAllDaily && { rewarded_all_dailies: true }),
    },
  };

  await missions.updateOne({ _id: mission._id }, missionUpdate);
  await users.updateOne(
    { _id: user._id },
    {
      $set: { last_updated: getCurrentPST().toJSDate() },
      $inc: { ppts: rewardData.totalBonus, energy: -rewardData.cost },
    }
  );

  const updatedUser = await users.findOne({ _id: user._id });
  return { rewardData, totalTime, dailyBonus, completedAllDaily, updatedUser };
}

export async function processMissionDeletion(db, user, missionId) {
  const missions = db.collection("missions");

  const mission = await missions.findOne({ _id: missionId });

  if (!mission) throw new Error("NOT_FOUND");
  if (mission.user_id !== user._id) throw new Error("FORBIDDEN");
  if (mission.is_system) throw new Error("SYSTEM_PROTECTED");

  await missions.deleteOne({ _id: mission._id });

  return mission;
}

export async function processMissionLockIn(db, user, missionId) {
  const missions = db.collection("missions");

  const alreadyLocked = await missions.findOne({
    user_id: user._id,
    locked_in_at: { $ne: null },
  });

  if (alreadyLocked) return { status: "ALREADY_LOCKED", mission: alreadyLocked };

  const mission = await missions.findOne({ _id: missionId });
  if (!mission) throw new Error("NOT_FOUND");
  if (mission.user_id !== user._id) throw new Error("FORBIDDEN");

  await missions.updateOne({ _id: missionId }, { $set: { locked_in_at: getCurrentPST().toJSDate() } });

  const updatedMission = await missions.findOne({ _id: missionId });
  return { status: "SUCCESS", mission: updatedMission };
}

export async function sendDailyBonusFollowUp(interaction) {
  const congratsMsgs = ["Woah!", "Harikitte ikou!", "How did you just do that.", "You've been so good..."];
  const congratsMsg = congratsMsgs[Math.floor(Math.random() * congratsMsgs.length)];

  const dailyBonusMsg = `\`${congratsMsg}\` \n> \`✨ Completed all daily missions!\``;
  return interaction.followUp({
    components: [new TextDisplayBuilder().setContent(dailyBonusMsg)],
    flags: MessageFlags.IsComponentsV2,
  });
}
