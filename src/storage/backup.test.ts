import { describe, expect, it } from "vitest";
import { validateBackupPayload } from "./backup";
import type { BackupPayload } from "../types";

const validPayload: BackupPayload = {
  schemaVersion: "1.0.0",
  exportedAt: "2026-05-23T00:00:00.000Z",
  appName: "health-record-pwa",
  foods: [
    {
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
    },
  ],
  intakeRecords: [],
  dailyGoal: {
    id: "daily_goal",
    waterMl: 2000,
    fiberG: 25,
    proteinG: 80,
    updatedAt: "2026-05-23T00:00:00.000Z",
  },
  dailyCheckIns: [],
  settings: {
    id: "app_settings",
    locale: "zh-TW",
    enableAfternoonGapCheck: true,
    afternoonGapCheckHour: 16,
    afternoonGapCheckMinute: 0,
    createdAt: "2026-05-23T00:00:00.000Z",
    updatedAt: "2026-05-23T00:00:00.000Z",
  },
};

describe("backup validation", () => {
  it("accepts a valid v1 backup", () => {
    expect(validateBackupPayload(validPayload)).toEqual(validPayload);
  });

  it("rejects unsupported schema versions", () => {
    expect(() => validateBackupPayload({ ...validPayload, schemaVersion: "2.0.0" })).toThrow("不支援");
  });

  it("rejects invalid food records", () => {
    expect(() => validateBackupPayload({ ...validPayload, foods: [{ id: "broken" }] })).toThrow("foods");
  });
});
