import type { AppSettings, BackupPayload, DailyCheckIn, DailyGoal, FoodItem, IntakeRecord } from "../types";

export function validateBackupPayload(payload: unknown): BackupPayload {
  if (!isObject(payload)) throw new Error("備份檔格式錯誤。");
  if (payload.schemaVersion !== "1.0.0") throw new Error("不支援的備份版本。");
  if (payload.appName !== "health-record-pwa") throw new Error("這不是健康紀錄的備份檔。");
  if (!Array.isArray(payload.foods)) throw new Error("備份檔缺少 foods。");
  if (!Array.isArray(payload.intakeRecords)) throw new Error("備份檔缺少 intakeRecords。");
  if (!Array.isArray(payload.dailyCheckIns)) throw new Error("備份檔缺少 dailyCheckIns。");
  if (!isDailyGoal(payload.dailyGoal)) throw new Error("備份檔 dailyGoal 格式錯誤。");
  if (!isSettings(payload.settings)) throw new Error("備份檔 settings 格式錯誤。");
  if (!payload.foods.every(isFoodItem)) throw new Error("備份檔 foods 含有無效資料。");
  if (!payload.intakeRecords.every(isIntakeRecord)) throw new Error("備份檔 intakeRecords 含有無效資料。");
  if (!payload.dailyCheckIns.every(isDailyCheckIn)) throw new Error("備份檔 dailyCheckIns 含有無效資料。");
  return payload as BackupPayload;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFoodItem(value: unknown): value is FoodItem {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.category) &&
    isString(value.servingName) &&
    isNumber(value.servingAmount) &&
    isString(value.servingUnit) &&
    isNumber(value.waterMl) &&
    isNumber(value.fiberG) &&
    isNumber(value.proteinG) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isIntakeRecord(value: unknown): value is IntakeRecord {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.date) &&
    isNumber(value.hour) &&
    isString(value.foodNameSnapshot) &&
    isString(value.categorySnapshot) &&
    isString(value.servingNameSnapshot) &&
    isNumber(value.servingAmountSnapshot) &&
    isString(value.servingUnitSnapshot) &&
    isNumber(value.quantity) &&
    isNumber(value.waterMl) &&
    isNumber(value.fiberG) &&
    isNumber(value.proteinG) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDailyGoal(value: unknown): value is DailyGoal {
  return (
    isObject(value) &&
    value.id === "daily_goal" &&
    isNumber(value.waterMl) &&
    isNumber(value.fiberG) &&
    isNumber(value.proteinG) &&
    isString(value.updatedAt)
  );
}

function isDailyCheckIn(value: unknown): value is DailyCheckIn {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.date) &&
    value.checkType === "afternoon_gap_check" &&
    isNumber(value.waterGapMl) &&
    isNumber(value.fiberGapG) &&
    isNumber(value.proteinGapG)
  );
}

function isSettings(value: unknown): value is AppSettings {
  return (
    isObject(value) &&
    value.id === "app_settings" &&
    typeof value.enableAfternoonGapCheck === "boolean" &&
    isNumber(value.afternoonGapCheckHour) &&
    isNumber(value.afternoonGapCheckMinute) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}
