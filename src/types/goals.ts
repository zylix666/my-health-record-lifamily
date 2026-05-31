export type DailyGoal = {
  id: "daily_goal";
  waterMl: number;
  fiberG: number;
  proteinG: number;
  updatedAt: string;
};

export const DEFAULT_DAILY_GOAL: DailyGoal = {
  id: "daily_goal",
  waterMl: 2000,
  fiberG: 25,
  proteinG: 80,
  updatedAt: new Date().toISOString(),
};
