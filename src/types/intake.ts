import type { FoodCategory, ServingUnit } from "./food";

export type IntakeRecord = {
  id: string;

  // Local date string, format: YYYY-MM-DD
  date: string;

  // Hour selected by user, 0-23.
  // UI should display as 00:00, 01:00, ... 23:00.
  hour: number;

  // Optional minute for future extension. MVP may default to 0.
  minute?: number;

  // Original food reference. Keep this for linking, but do not depend on it for historical nutrient calculation.
  foodId?: string;

  // Snapshot fields copied from FoodItem at record creation time.
  foodNameSnapshot: string;
  categorySnapshot: FoodCategory;
  servingNameSnapshot: string;
  servingAmountSnapshot: number;
  servingUnitSnapshot: ServingUnit;

  // Quantity selected by user. Example: 1.5 bottles, 2 servings.
  quantity: number;

  // Nutrient values after multiplying by quantity.
  // These are snapshots and should not be recalculated from current FoodItem after creation.
  waterMl: number;
  fiberG: number;
  proteinG: number;

  note?: string;
  tags?: string[];

  createdAt: string;
  updatedAt: string;
};

export type DailyTotal = {
  date: string;
  waterMl: number;
  fiberG: number;
  proteinG: number;
};
