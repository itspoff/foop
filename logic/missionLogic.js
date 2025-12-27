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
      ...(completedAllDaily && { rewarded_all_dailies: true }),
    },
  };

  if (mission.is_daily) missionUpdate.$inc = { xp: rewardData.totalBonus };

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

// logic/missionLogic.js

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
