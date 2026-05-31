import { describe, expect, it } from "vitest";
import { calculateDailyTotal, calculateGap, calculateGoalProgress, createIntakeRecordFromFood } from "./calculations";
import type { DailyGoal, FoodItem, IntakeRecord } from "../types";

const food: FoodItem = {
  id: "food_1",
  name: "豆漿",
  category: "beverage",
  servingName: "1 瓶",
  servingAmount: 450,
  servingUnit: "bottle",
  waterMl: 430,
  fiberG: 5,
  proteinG: 15,
  createdAt: "2026-05-23T00:00:00.000Z",
  updatedAt: "2026-05-23T00:00:00.000Z",
};

const goal: DailyGoal = {
  id: "daily_goal",
  waterMl: 2000,
  fiberG: 25,
  proteinG: 80,
  updatedAt: "2026-05-23T00:00:00.000Z",
};

describe("nutrition calculations", () => {
  it("creates intake records with food snapshots", () => {
    const record = createIntakeRecordFromFood({
      id: "intake_1",
      date: "2026-05-23",
      hour: 8,
      food,
      quantity: 2,
      nowIso: "2026-05-23T08:00:00.000Z",
    });

    const editedFood = { ...food, name: "新版豆漿", proteinG: 20 };

    expect(record.foodNameSnapshot).toBe("豆漿");
    expect(record.proteinG).toBe(30);
    expect(editedFood.proteinG).toBe(20);
  });

  it("totals only records on the requested date", () => {
    const records: IntakeRecord[] = [
      createIntakeRecordFromFood({ id: "a", date: "2026-05-23", hour: 8, food, quantity: 1, nowIso: "2026-05-23T08:00:00.000Z" }),
      createIntakeRecordFromFood({ id: "b", date: "2026-05-23", hour: 12, food, quantity: 0.5, nowIso: "2026-05-23T12:00:00.000Z" }),
      createIntakeRecordFromFood({ id: "c", date: "2026-05-22", hour: 12, food, quantity: 1, nowIso: "2026-05-22T12:00:00.000Z" }),
    ];

    expect(calculateDailyTotal("2026-05-23", records)).toEqual({
      date: "2026-05-23",
      waterMl: 645,
      fiberG: 7.5,
      proteinG: 22.5,
    });
  });

  it("calculates gaps and caps progress display", () => {
    const total = { date: "2026-05-23", waterMl: 2100, fiberG: 10, proteinG: 40 };

    expect(calculateGap(total, goal)).toEqual({
      waterGapMl: 0,
      fiberGapG: 15,
      proteinGapG: 40,
    });
    expect(calculateGoalProgress(total, goal)).toEqual({
      waterPercent: 105,
      fiberPercent: 40,
      proteinPercent: 50,
    });
  });
});
