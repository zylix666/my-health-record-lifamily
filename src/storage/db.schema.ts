/*
Recommended Dexie schema.
Codex should implement this with Dexie.js.

Database name: healthRecordDb
Version: 1
Tables:
- foods
- intakeRecords
- dailyGoal
- dailyCheckIns
- settings
*/

export const DB_NAME = "healthRecordDb";
export const DB_VERSION = 1;

export const DEXIE_STORES = {
  foods: "id, name, category, updatedAt",
  intakeRecords: "id, date, hour, foodId, categorySnapshot, createdAt, updatedAt",
  dailyGoal: "id, updatedAt",
  dailyCheckIns: "id, date, checkType, checkedAt, dismissedAt, updatedAt",
  settings: "id, updatedAt",
};
