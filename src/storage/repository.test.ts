import { describe, expect, it } from "vitest";
import { DexieHealthRecordRepository } from "./repository";
import type { BackupPayload, FoodItem } from "../types";

describe("DexieHealthRecordRepository", () => {
  it("seeds foods and preserves intake records when deleting a food item", async () => {
    const repo = new DexieHealthRecordRepository(`test_${crypto.randomUUID()}`);
    await repo.initialize();
    const foods = await repo.listFoods();
    expect(foods.length).toBeGreaterThan(0);

    const food = foods[0];
    await repo.saveIntakeRecord({
      id: "intake_1",
      date: "2026-05-23",
      hour: 8,
      foodId: food.id,
      foodNameSnapshot: food.name,
      categorySnapshot: food.category,
      servingNameSnapshot: food.servingName,
      servingAmountSnapshot: food.servingAmount,
      servingUnitSnapshot: food.servingUnit,
      quantity: 1,
      waterMl: food.waterMl,
      fiberG: food.fiberG,
      proteinG: food.proteinG,
      createdAt: "2026-05-23T08:00:00.000Z",
      updatedAt: "2026-05-23T08:00:00.000Z",
    });
    await repo.deleteFood(food.id);

    const records = await repo.listIntakeRecordsByDate("2026-05-23");
    expect(records).toHaveLength(1);
    expect(records[0].foodNameSnapshot).toBe(food.name);
  });

  it("adds missing spreadsheet seed foods to existing local databases", async () => {
    const repo = new DexieHealthRecordRepository(`test_${crypto.randomUUID()}`);
    const now = "2026-05-23T08:00:00.000Z";
    const existingFood: FoodItem = {
      id: "food_existing_water",
      name: "水",
      category: "beverage",
      servingName: "500ml",
      servingAmount: 500,
      servingUnit: "ml",
      waterMl: 500,
      fiberG: 0,
      proteinG: 0,
      createdAt: now,
      updatedAt: now,
    };

    await repo.saveFood(existingFood);
    await repo.initialize();

    const soyFoods = await repo.listFoodsByCategory("soy");
    expect(soyFoods.map((food) => food.name)).toEqual(expect.arrayContaining([
      "光泉燕麥高纖豆漿",
      "無糖豆漿",
      "豆皮",
      "豆腐",
    ]));

    const waterFoods = (await repo.listFoods()).filter((food) => food.name === "水");
    expect(waterFoods).toHaveLength(1);
    expect(waterFoods[0].id).toBe(existingFood.id);
  });

  it("does not reseed foods after the user deletes every food item", async () => {
    const dbName = `test_${crypto.randomUUID()}`;
    const repo = new DexieHealthRecordRepository(dbName);
    await repo.initialize();

    const foods = await repo.listFoods();
    expect(foods.length).toBeGreaterThan(0);
    await Promise.all(foods.map((food) => repo.deleteFood(food.id)));
    expect(await repo.listFoods()).toHaveLength(0);

    const reopenedRepo = new DexieHealthRecordRepository(dbName);
    await reopenedRepo.initialize();
    expect(await reopenedRepo.listFoods()).toHaveLength(0);
  });

  it("restores seed foods when clearing all data", async () => {
    const repo = new DexieHealthRecordRepository(`test_${crypto.randomUUID()}`);
    await repo.initialize();

    const foods = await repo.listFoods();
    await Promise.all(foods.map((food) => repo.deleteFood(food.id)));
    await repo.clearAllData();

    expect((await repo.listFoods()).length).toBeGreaterThan(0);
  });

  it("removes duplicate food rows during initialization", async () => {
    const dbName = `test_${crypto.randomUUID()}`;
    const duplicateFood: FoodItem = {
      id: "food_duplicate_a",
      name: "光泉燕麥高纖豆漿",
      category: "soy",
      servingName: "450ml",
      servingAmount: 450,
      servingUnit: "ml",
      waterMl: 450,
      fiberG: 0,
      proteinG: 14.4,
      createdAt: "2026-05-23T00:00:00.000Z",
      updatedAt: "2026-05-23T00:00:00.000Z",
    };
    const repo = new DexieHealthRecordRepository(dbName);
    await repo.saveSettings({
      id: "app_settings",
      locale: "zh-TW",
      enableAfternoonGapCheck: true,
      afternoonGapCheckHour: 16,
      afternoonGapCheckMinute: 0,
      hasSeededFoods: true,
      createdAt: "2026-05-23T00:00:00.000Z",
      updatedAt: "2026-05-23T00:00:00.000Z",
    });
    await repo.saveFood(duplicateFood);
    await repo.saveFood({ ...duplicateFood, id: "food_duplicate_b", createdAt: "2026-05-24T00:00:00.000Z" });

    const reopenedRepo = new DexieHealthRecordRepository(dbName);
    await reopenedRepo.initialize();

    const matchingFoods = (await reopenedRepo.listFoods()).filter((food) => food.name === duplicateFood.name && food.servingName === duplicateFood.servingName);
    expect(matchingFoods).toHaveLength(1);
    expect(matchingFoods[0].id).toBe("food_duplicate_a");
  });

  it("merges imported foods by logical item and only updates changed food content", async () => {
    const repo = new DexieHealthRecordRepository(`test_${crypto.randomUUID()}`);
    const existingFood = testFood({
      id: "food_local",
      proteinG: 14.4,
      updatedAt: "2026-05-23T00:00:00.000Z",
    });
    await repo.saveFood(existingFood);
    await repo.saveIntakeRecord({
      id: "intake_local",
      date: "2026-05-23",
      hour: 8,
      foodId: existingFood.id,
      foodNameSnapshot: existingFood.name,
      categorySnapshot: existingFood.category,
      servingNameSnapshot: existingFood.servingName,
      servingAmountSnapshot: existingFood.servingAmount,
      servingUnitSnapshot: existingFood.servingUnit,
      quantity: 1,
      waterMl: existingFood.waterMl,
      fiberG: existingFood.fiberG,
      proteinG: existingFood.proteinG,
      createdAt: "2026-05-23T08:00:00.000Z",
      updatedAt: "2026-05-23T08:00:00.000Z",
    });

    await repo.importBackup(testBackup({
      foods: [testFood({
        id: "food_imported",
        proteinG: 16,
        updatedAt: "2026-05-24T00:00:00.000Z",
      })],
      intakeRecords: [],
    }));

    const foods = await repo.listFoods();
    expect(foods).toHaveLength(1);
    expect(foods[0]).toMatchObject({
      id: "food_local",
      proteinG: 16,
      updatedAt: "2026-05-24T00:00:00.000Z",
    });
    expect(await repo.listIntakeRecordsByDate("2026-05-23")).toHaveLength(1);
  });

  it("does not update imported foods when only backup metadata differs", async () => {
    const repo = new DexieHealthRecordRepository(`test_${crypto.randomUUID()}`);
    const existingFood = testFood({
      id: "food_local",
      updatedAt: "2026-05-23T00:00:00.000Z",
    });
    await repo.saveFood(existingFood);

    await repo.importBackup(testBackup({
      foods: [testFood({
        id: "food_imported",
        updatedAt: "2026-05-24T00:00:00.000Z",
      })],
    }));

    const foods = await repo.listFoods();
    expect(foods).toHaveLength(1);
    expect(foods[0]).toEqual(existingFood);
  });
});

function testFood(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: "food_1",
    name: "光泉燕麥高纖豆漿",
    category: "soy",
    servingName: "450ml",
    servingAmount: 450,
    servingUnit: "ml",
    waterMl: 450,
    fiberG: 0,
    proteinG: 14.4,
    createdAt: "2026-05-23T00:00:00.000Z",
    updatedAt: "2026-05-23T00:00:00.000Z",
    ...overrides,
  };
}

function testBackup(overrides: Partial<BackupPayload> = {}): BackupPayload {
  return {
    schemaVersion: "1.0.0",
    exportedAt: "2026-05-24T00:00:00.000Z",
    appName: "health-record-pwa",
    foods: [],
    intakeRecords: [],
    dailyGoal: {
      id: "daily_goal",
      waterMl: 2000,
      fiberG: 25,
      proteinG: 80,
      updatedAt: "2026-05-24T00:00:00.000Z",
    },
    dailyCheckIns: [],
    settings: {
      id: "app_settings",
      locale: "zh-TW",
      enableAfternoonGapCheck: true,
      afternoonGapCheckHour: 16,
      afternoonGapCheckMinute: 0,
      hasSeededFoods: true,
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
    },
    ...overrides,
  };
}
