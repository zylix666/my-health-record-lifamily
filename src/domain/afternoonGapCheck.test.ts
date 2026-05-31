import { describe, expect, it } from "vitest";
import { buildAfternoonGapCheck, shouldShowAfternoonGapCheck } from "./afternoonGapCheck";
import { createIntakeRecordFromFood } from "./calculations";
import type { DailyGoal, FoodItem } from "../types";

const food: FoodItem = {
  id: "food_1",
  name: "水",
  category: "beverage",
  servingName: "250ml",
  servingAmount: 250,
  servingUnit: "ml",
  waterMl: 250,
  fiberG: 0,
  proteinG: 0,
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

describe("afternoon gap check", () => {
  it("appears after 16:00 only when enabled and not dismissed", () => {
    expect(shouldShowAfternoonGapCheck({ currentDate: "2026-05-23", currentHour: 15, currentMinute: 59, enableAfternoonGapCheck: true })).toBe(false);
    expect(shouldShowAfternoonGapCheck({ currentDate: "2026-05-23", currentHour: 16, currentMinute: 0, enableAfternoonGapCheck: true })).toBe(true);
    expect(
      shouldShowAfternoonGapCheck({
        currentDate: "2026-05-23",
        currentHour: 17,
        currentMinute: 0,
        enableAfternoonGapCheck: true,
        existingCheckIn: {
          id: "check_1",
          date: "2026-05-23",
          checkType: "afternoon_gap_check",
          scheduledHour: 16,
          scheduledMinute: 0,
          dismissedAt: "2026-05-23T17:00:00.000Z",
          waterGapMl: 0,
          fiberGapG: 0,
          proteinGapG: 0,
          createdAt: "2026-05-23T16:00:00.000Z",
          updatedAt: "2026-05-23T17:00:00.000Z",
        },
      }),
    ).toBe(false);
  });

  it("builds the remaining gaps from current records", () => {
    const check = buildAfternoonGapCheck({
      id: "check_1",
      date: "2026-05-23",
      records: [
        createIntakeRecordFromFood({
          id: "intake_1",
          date: "2026-05-23",
          hour: 9,
          food,
          quantity: 4,
          nowIso: "2026-05-23T09:00:00.000Z",
        }),
      ],
      goal,
      nowIso: "2026-05-23T16:00:00.000Z",
    });

    expect(check.waterGapMl).toBe(1000);
    expect(check.fiberGapG).toBe(25);
    expect(check.proteinGapG).toBe(80);
  });
});
