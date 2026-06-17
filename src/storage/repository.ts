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
    const existingSettings = await this.db.settings.get("app_settings");
    const settings = await this.getSettings();
    const shouldInitialSeed = !settings.hasSeededFoods && !existingSettings;
    const foodCount = await this.db.foods.count();
    if (foodCount === 0) {
      if (shouldInitialSeed) {
        await this.seedFoods();
      }
      await this.markFoodsSeeded();
      return;
    }

    const existingFoods = await this.db.foods.toArray();
    if (isLegacyDemoFoodSet(existingFoods)) {
      await this.db.foods.clear();
      await this.seedFoods();
      await this.markFoodsSeeded();
      return;
    } else {
      await this.removeDuplicateFoods(existingFoods);
    }

    if (!settings.hasSeededFoods) {
      await this.addMissingSeedFoods(await this.db.foods.toArray());
    } else {
      await this.removeDuplicateFoods(await this.db.foods.toArray());
    }
    await this.markFoodsSeeded();
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
    if (existing) {
      return { ...DEFAULT_APP_SETTINGS, ...existing, hasSeededFoods: existing.hasSeededFoods ?? false };
    }
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
      await this.mergeFoods(validPayload.foods);
      await this.mergeById(this.db.intakeRecords, validPayload.intakeRecords);
      await this.mergeById(this.db.dailyCheckIns, validPayload.dailyCheckIns);
      const existingGoal = await this.db.dailyGoal.get(validPayload.dailyGoal.id);
      if (!existingGoal || !sameRecord(existingGoal, validPayload.dailyGoal)) {
        await this.db.dailyGoal.put(validPayload.dailyGoal);
      }
      const importedSettings = { ...DEFAULT_APP_SETTINGS, ...validPayload.settings, hasSeededFoods: true };
      const existingSettings = await this.db.settings.get(importedSettings.id);
      if (!existingSettings || !sameRecord(existingSettings, importedSettings)) {
        await this.db.settings.put(importedSettings);
      }
      await this.removeDuplicateFoods(await this.db.foods.toArray());
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
      uniqueSeedFoods().map((food) => ({
        ...food,
        id: generateId("food"),
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  private async addMissingSeedFoods(existingFoods: FoodItem[]): Promise<void> {
    const existingKeys = new Set(existingFoods.map(foodImportKey));
    const now = new Date().toISOString();
    const missingFoods = uniqueSeedFoods().filter((food) => !existingKeys.has(foodImportKey(food))).map((food) => ({
      ...food,
      id: generateId("food"),
      createdAt: now,
      updatedAt: now,
    }));

    if (missingFoods.length > 0) {
      await this.db.foods.bulkPut(missingFoods);
    }
  }

  private async removeDuplicateFoods(foods: FoodItem[]): Promise<void> {
    const foodByKey = new Map<string, FoodItem>();
    const duplicateIds: string[] = [];

    foods
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .forEach((food) => {
        const key = foodContentKey(food);
        if (foodByKey.has(key)) {
          duplicateIds.push(food.id);
          return;
        }
        foodByKey.set(key, food);
      });

    if (duplicateIds.length > 0) {
      await this.db.foods.bulkDelete(duplicateIds);
    }
  }

  private async mergeFoods(importedFoods: FoodItem[]): Promise<void> {
    const existingFoods = await this.db.foods.toArray();
    const existingById = new Map(existingFoods.map((food) => [food.id, food]));
    const existingByKey = new Map(existingFoods.map((food) => [foodImportKey(food), food]));
    const pendingByKey = new Map<string, FoodItem>();

    importedFoods.forEach((food) => pendingByKey.set(foodImportKey(food), food));

    for (const importedFood of pendingByKey.values()) {
      const existingFood = existingByKey.get(foodImportKey(importedFood)) ?? existingById.get(importedFood.id);
      if (!existingFood) {
        await this.db.foods.put(importedFood);
        existingById.set(importedFood.id, importedFood);
        existingByKey.set(foodImportKey(importedFood), importedFood);
        continue;
      }

      const mergedFood = {
        ...importedFood,
        id: existingFood.id,
        createdAt: existingFood.createdAt,
      };
      if (!sameFoodContent(existingFood, mergedFood)) {
        await this.db.foods.put(mergedFood);
        existingById.set(mergedFood.id, mergedFood);
        existingByKey.set(foodImportKey(mergedFood), mergedFood);
      }
    }
  }

  private async mergeById<T extends { id: string }>(table: Table<T, string>, importedRecords: T[]): Promise<void> {
    for (const importedRecord of importedRecords) {
      const existingRecord = await table.get(importedRecord.id);
      if (!existingRecord || !sameRecord(existingRecord, importedRecord)) {
        await table.put(importedRecord);
      }
    }
  }

  private async markFoodsSeeded(): Promise<void> {
    const settings = await this.getSettings();
    if (settings.hasSeededFoods) return;
    await this.saveSettings({ ...settings, hasSeededFoods: true, updatedAt: new Date().toISOString() });
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

function uniqueSeedFoods(): Omit<FoodItem, "id" | "createdAt" | "updatedAt">[] {
  const foodByKey = new Map<string, Omit<FoodItem, "id" | "createdAt" | "updatedAt">>();
  SEED_FOODS.forEach((food) => {
    foodByKey.set(foodContentKey(food), food);
  });
  return [...foodByKey.values()];
}

function foodContentKey(food: Omit<FoodItem, "id" | "createdAt" | "updatedAt">): string {
  return [
    food.category,
    food.name.trim(),
    food.servingName.trim(),
    food.servingAmount,
    food.servingUnit,
    food.waterMl,
    food.fiberG,
    food.proteinG,
    food.note ?? "",
  ].join("::");
}

function foodImportKey(food: Pick<FoodItem, "category" | "name" | "servingName">): string {
  return [
    food.category,
    food.name.trim(),
    food.servingName.trim(),
  ].join("::");
}

function sameFoodContent(a: FoodItem, b: FoodItem): boolean {
  return foodContentKey(a) === foodContentKey(b);
}

function sameRecord<T>(a: T, b: T): boolean {
  return JSON.stringify(sortObjectKeys(a)) === JSON.stringify(sortObjectKeys(b));
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, childValue]) => [key, sortObjectKeys(childValue)]),
    );
  }
  return value;
}

export const repository = new DexieHealthRecordRepository();
