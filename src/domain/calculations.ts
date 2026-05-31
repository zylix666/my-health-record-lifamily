import type { DailyGoal, DailyTotal, FoodItem, IntakeRecord } from "../types";

export function calculateRecordNutrition(food: FoodItem, quantity: number) {
  return {
    waterMl: roundToOne(food.waterMl * quantity),
    fiberG: roundToOne(food.fiberG * quantity),
    proteinG: roundToOne(food.proteinG * quantity),
  };
}

export function createIntakeRecordFromFood(params: {
  id: string;
  date: string;
  hour: number;
  minute?: number;
  food: FoodItem;
  quantity: number;
  note?: string;
  nowIso: string;
}): IntakeRecord {
  const nutrients = calculateRecordNutrition(params.food, params.quantity);

  return {
    id: params.id,
    date: params.date,
    hour: params.hour,
    minute: params.minute ?? 0,
    foodId: params.food.id,
    foodNameSnapshot: params.food.name,
    categorySnapshot: params.food.category,
    servingNameSnapshot: params.food.servingName,
    servingAmountSnapshot: params.food.servingAmount,
    servingUnitSnapshot: params.food.servingUnit,
    quantity: params.quantity,
    ...nutrients,
    note: params.note,
    createdAt: params.nowIso,
    updatedAt: params.nowIso,
  };
}

export function calculateDailyTotal(date: string, records: IntakeRecord[]): DailyTotal {
  const recordsOfDate = records.filter((record) => record.date === date);

  return recordsOfDate.reduce<DailyTotal>(
    (total, record) => ({
      date,
      waterMl: roundToOne(total.waterMl + record.waterMl),
      fiberG: roundToOne(total.fiberG + record.fiberG),
      proteinG: roundToOne(total.proteinG + record.proteinG),
    }),
    { date, waterMl: 0, fiberG: 0, proteinG: 0 },
  );
}

export function calculateGap(total: DailyTotal, goal: DailyGoal) {
  return {
    waterGapMl: Math.max(roundToOne(goal.waterMl - total.waterMl), 0),
    fiberGapG: Math.max(roundToOne(goal.fiberG - total.fiberG), 0),
    proteinGapG: Math.max(roundToOne(goal.proteinG - total.proteinG), 0),
  };
}

export function calculateGoalProgress(total: DailyTotal, goal: DailyGoal) {
  return {
    waterPercent: percentage(total.waterMl, goal.waterMl),
    fiberPercent: percentage(total.fiberG, goal.fiberG),
    proteinPercent: percentage(total.proteinG, goal.proteinG),
  };
}

function percentage(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(roundToOne((value / target) * 100), 999);
}

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}
