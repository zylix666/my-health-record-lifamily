import Dexie, { type Table } from "dexie";
import { SEED_FOODS } from "../data/seedFoods";
import { DEFAULT_APP_SETTINGS, DEFAULT_DAILY_GOAL, type AppSettings, type BackupPayload, type DailyCheckIn, type DailyGoal, type FoodCategory, type FoodItem, type IntakeRecord } from "../types";
import { generateId } from "../utils/date";
import { validateBackupPayload } from "./backup";
import { DB_NAME, DB_VERSION, DEXIE_STORES } from "./db.schema";
import type { HealthRecordRepository } from "./repository.contract";

class HealthRecordDexie extends Dexie {
  foods!: Table<FoodItem, string>;
  intakeRecords!: Table<IntakeRecord, string>;
  dailyGoal!: Table<DailyGoal, string>;
  dailyCheckIns!: Table<DailyCheckIn, string>;
  settings!: Table<AppSettings, string>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(DB_VERSION).stores(DEXIE_STORES);
  }
}

export class DexieHealthRecordRepository implements HealthRecordRepository {
  private db: HealthRecordDexie;

  constructor(dbName = DB_NAME) {
    this.db = new HealthRecordDexie(dbName);
  }

  async initialize(): Promise<void> {
    await this.getDailyGoal();
    await this.getSettings();
    const foodCount = await this.db.foods.count();
    if (foodCount === 0) {
      await this.seedFoods();
      return;
    }

    const existingFoods = await this.db.foods.toArray();
    if (isLegacyDemoFoodSet(existingFoods)) {
      await this.db.foods.clear();
      await this.seedFoods();
      return;
    }

    await this.addMissingSeedFoods(existingFoods);
  }

  listFoods(): Promise<FoodItem[]> {
    return this.db.foods.orderBy("name").toArray();
  }

  listFoodsByCategory(category: FoodCategory): Promise<FoodItem[]> {
    return this.db.foods.where("category").equals(category).sortBy("name");
  }

  getFood(id: string): Promise<FoodItem | undefined> {
    return this.db.foods.get(id);
  }

  saveFood(food: FoodItem): Promise<void> {
    return this.db.foods.put(food).then(() => undefined);
  }

  deleteFood(id: string): Promise<void> {
    return this.db.foods.delete(id);
  }

  async listIntakeRecordsByDate(date: string): Promise<IntakeRecord[]> {
    const records = await this.db.intakeRecords.where("date").equals(date).toArray();
    return records.sort(sortRecords);
  }

  async listIntakeRecordsByDateRange(startDate: string, endDate: string): Promise<IntakeRecord[]> {
    const records = await this.db.intakeRecords.where("date").between(startDate, endDate, true, true).toArray();
    return records.sort((a, b) => a.date.localeCompare(b.date) || sortRecords(a, b));
  }

  getIntakeRecord(id: string): Promise<IntakeRecord | undefined> {
    return this.db.intakeRecords.get(id);
  }

  saveIntakeRecord(record: IntakeRecord): Promise<void> {
    return this.db.intakeRecords.put(record).then(() => undefined);
  }

  deleteIntakeRecord(id: string): Promise<void> {
    return this.db.intakeRecords.delete(id);
  }

  async getDailyGoal(): Promise<DailyGoal> {
    const existing = await this.db.dailyGoal.get("daily_goal");
    if (existing) return existing;
    await this.db.dailyGoal.put({ ...DEFAULT_DAILY_GOAL });
    return { ...DEFAULT_DAILY_GOAL };
  }

  saveDailyGoal(goal: DailyGoal): Promise<void> {
    return this.db.dailyGoal.put(goal).then(() => undefined);
  }

  async getDailyCheckIn(date: string, checkType: DailyCheckIn["checkType"]): Promise<DailyCheckIn | undefined> {
    const checkIns = await this.db.dailyCheckIns.where("date").equals(date).toArray();
    return checkIns.find((checkIn) => checkIn.checkType === checkType);
  }

  saveDailyCheckIn(checkIn: DailyCheckIn): Promise<void> {
    return this.db.dailyCheckIns.put(checkIn).then(() => undefined);
  }

  async getSettings(): Promise<AppSettings> {
    const existing = await this.db.settings.get("app_settings");
    if (existing) return existing;
    await this.db.settings.put({ ...DEFAULT_APP_SETTINGS });
    return { ...DEFAULT_APP_SETTINGS };
  }

  saveSettings(settings: AppSettings): Promise<void> {
    return this.db.settings.put(settings).then(() => undefined);
  }

  async exportBackup(): Promise<BackupPayload> {
    const [foods, intakeRecords, dailyGoal, dailyCheckIns, settings] = await Promise.all([
      this.db.foods.toArray(),
      this.db.intakeRecords.toArray(),
      this.getDailyGoal(),
      this.db.dailyCheckIns.toArray(),
      this.getSettings(),
    ]);
    return {
      schemaVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      appName: "health-record-pwa",
      foods,
      intakeRecords,
      dailyGoal,
      dailyCheckIns,
      settings,
    };
  }

  async importBackup(payload: BackupPayload): Promise<void> {
    const validPayload = validateBackupPayload(payload);
    await this.db.transaction("rw", [this.db.foods, this.db.intakeRecords, this.db.dailyGoal, this.db.dailyCheckIns, this.db.settings], async () => {
      await this.db.foods.clear();
      await this.db.intakeRecords.clear();
      await this.db.dailyGoal.clear();
      await this.db.dailyCheckIns.clear();
      await this.db.settings.clear();
      await this.db.foods.bulkPut(validPayload.foods);
      await this.db.intakeRecords.bulkPut(validPayload.intakeRecords);
      await this.db.dailyGoal.put(validPayload.dailyGoal);
      await this.db.dailyCheckIns.bulkPut(validPayload.dailyCheckIns);
      await this.db.settings.put(validPayload.settings);
    });
  }

  async clearAllData(): Promise<void> {
    await this.db.transaction("rw", [this.db.foods, this.db.intakeRecords, this.db.dailyGoal, this.db.dailyCheckIns, this.db.settings], async () => {
      await this.db.foods.clear();
      await this.db.intakeRecords.clear();
      await this.db.dailyGoal.clear();
      await this.db.dailyCheckIns.clear();
      await this.db.settings.clear();
    });
    await this.initialize();
  }

  private async seedFoods(): Promise<void> {
    const now = new Date().toISOString();
    await this.db.foods.bulkPut(
      SEED_FOODS.map((food) => ({
        ...food,
        id: generateId("food"),
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  private async addMissingSeedFoods(existingFoods: FoodItem[]): Promise<void> {
    const existingKeys = new Set(existingFoods.map(foodKey));
    const now = new Date().toISOString();
    const missingFoods = SEED_FOODS.filter((food) => !existingKeys.has(foodKey(food))).map((food) => ({
      ...food,
      id: generateId("food"),
      createdAt: now,
      updatedAt: now,
    }));

    if (missingFoods.length > 0) {
      await this.db.foods.bulkPut(missingFoods);
    }
  }
}

function sortRecords(a: IntakeRecord, b: IntakeRecord): number {
  return a.hour - b.hour || (a.minute ?? 0) - (b.minute ?? 0) || a.createdAt.localeCompare(b.createdAt);
}

function isLegacyDemoFoodSet(foods: FoodItem[]): boolean {
  if (foods.length !== 6) return false;
  const legacyNames = new Set(["水", "無糖高蛋白豆漿", "雞胸肉", "香蕉", "燕麥飯", "花椰菜"]);
  return foods.every((food) => legacyNames.has(food.name));
}

function foodKey(food: Pick<FoodItem, "name" | "category" | "servingName">): string {
  return `${food.category}::${food.name}::${food.servingName}`;
}

export const repository = new DexieHealthRecordRepository();
