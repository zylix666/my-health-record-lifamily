import { describe, expect, it } from "vitest";
import { DexieHealthRecordRepository } from "./repository";
import type { FoodItem } from "../types";

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
});
