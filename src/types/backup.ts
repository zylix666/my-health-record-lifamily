import type { FoodItem } from "./food";
import type { IntakeRecord } from "./intake";
import type { DailyGoal } from "./goals";
import type { DailyCheckIn } from "./checkin";
import type { AppSettings } from "./settings";

export type BackupPayload = {
  schemaVersion: "1.0.0";
  exportedAt: string;
  appName: "health-record-pwa";

  foods: FoodItem[];
  intakeRecords: IntakeRecord[];
  dailyGoal: DailyGoal;
  dailyCheckIns: DailyCheckIn[];
  settings: AppSettings;
};
