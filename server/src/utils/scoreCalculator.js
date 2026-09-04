export function calculateScore(isCorrect, timeToAnswer, timeLimitMs, basePoints, streak) {
  if (!isCorrect) {
    return { points: 0, newStreak: 0 };
  }

  const timeBonus = 1 - (timeToAnswer / timeLimitMs / 2);
  const streakBonus = Math.min(streak * 100, 500);
  const points = Math.round(basePoints * Math.max(timeBonus, 0.5)) + streakBonus;

  return { points, newStreak: streak + 1 };
}
