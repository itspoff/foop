import { formatMission } from "./formatLabels.js";
import { formatTime } from "./formatTime.js";

export function calculateMissionRewards({ mission, user, totalTime = 0, dailyBonus = 0 }) {
  let bonus = 12 + Math.floor(Math.random() * 13);
  let cost = 10 + Math.floor(Math.random() * 11);

  if (user.energy - cost < 0) {
    cost = user.energy;
  }
  if (user.energy === 0 && !mission.is_daily) {
    cost = 0;
    bonus = 0;
  }
  if (mission.is_daily) {
    cost = 0;
  }

  const cheerCount = mission.cheers?.length || 0;
  const focusedMultiplier = totalTime > 300 ? 1.35 : 1;
  const totalBonus = Math.floor(bonus * focusedMultiplier * (cheerCount + 1) + dailyBonus);

  return {
    cost,
    bonus,
    cheerCount,
    totalBonus,
  };
}

export function formatMissionRewardMessage({
  mission,
  totalTime,
  cost,
  bonus,
  cheerCount,
  totalBonus,
  dailyBonus,
  user,
}) {
  const completeMissionMsg = totalTime
    ? `${formatMission(mission)} \`🐾 Completed in ⏱️ ${formatTime(totalTime)}!\``
    : `${formatMission(mission)} \`🐾 Completed!\``;

  if (totalBonus <= 0) return completeMissionMsg;

  const bonusMessage =
    `\n> -# \`Reward: ${bonus}\`` +
    (totalTime > 300 ? " `🍵 Focused (x1.35)`" : "") +
    (cheerCount > 0 ? ` \`👏 Cheer (x${cheerCount + 1})\`` : "") +
    (dailyBonus > 0 ? ` \`🎯 All dailies complete! +${dailyBonus}\`` : "") +
    `\n> -# \`Energy: ${user.energy}(-${cost})\` \`Ppts: ${user.ppts}(+${totalBonus})\``;

  return completeMissionMsg + bonusMessage;
}

export function calculateLevelUp(mission) {
  if (!mission.is_daily) return 0;
  if (mission.level >= mission.max_level) return 0;
  let level = mission.level ?? 1;
  let xp = mission.xp ?? mission.ppts_gained ?? 0;
  while (true) {
    const xpToNextLevel = 5 * 2 ** level;
    if (xp > xpToNextLevel && level < mission.max_level) {
      xp -= xpToNextLevel;
      level++;
    } else {
      break;
    }
  }
  return {
    level,
    xp,
  };
}
