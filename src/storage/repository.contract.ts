import type {
  AppSettings,
  BackupPayload,
  DailyCheckIn,
  DailyGoal,
  FoodCategory,
  FoodItem,
  IntakeRecord,
} from "../types";

export type HealthRecordRepository = {
  // Food database
  listFoods(): Promise<FoodItem[]>;
  listFoodsByCategory(category: FoodCategory): Promise<FoodItem[]>;
  getFood(id: string): Promise<FoodItem | undefined>;
  saveFood(food: FoodItem): Promise<void>;
  deleteFood(id: string): Promise<void>;

  // Intake records
  listIntakeRecordsByDate(date: string): Promise<IntakeRecord[]>;
  listIntakeRecordsByDateRange(startDate: string, endDate: string): Promise<IntakeRecord[]>;
  getIntakeRecord(id: string): Promise<IntakeRecord | undefined>;
  saveIntakeRecord(record: IntakeRecord): Promise<void>;
  deleteIntakeRecord(id: string): Promise<void>;

  // Goals
  getDailyGoal(): Promise<DailyGoal>;
  saveDailyGoal(goal: DailyGoal): Promise<void>;

  // Check-ins
  getDailyCheckIn(date: string, checkType: DailyCheckIn["checkType"]): Promise<DailyCheckIn | undefined>;
  saveDailyCheckIn(checkIn: DailyCheckIn): Promise<void>;

  // Settings
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  // Backup
  exportBackup(): Promise<BackupPayload>;
  importBackup(payload: BackupPayload): Promise<void>;
  clearAllData(): Promise<void>;
};
