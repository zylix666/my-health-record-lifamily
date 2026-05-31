export type FoodCategory =
  | "staple"
  | "protein"
  | "vegetable"
  | "fruit"
  | "beverage"
  | "dairy"
  | "snack"
  | "other";

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  staple: "主食",
  protein: "蛋白質",
  vegetable: "蔬菜",
  fruit: "水果",
  beverage: "飲品",
  dairy: "乳製品",
  snack: "點心",
  other: "其他",
};

export const FOOD_CATEGORIES = Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[];

export type ServingUnit = "ml" | "g" | "piece" | "bottle" | "cup" | "bowl" | "serving";

export const SERVING_UNITS: ServingUnit[] = ["ml", "g", "piece", "bottle", "cup", "bowl", "serving"];

export type FoodItem = {
  id: string;
  name: string;
  category: FoodCategory;

  servingName: string;
  servingAmount: number;
  servingUnit: ServingUnit;

  waterMl: number;
  fiberG: number;
  proteinG: number;

  note?: string;

  createdAt: string;
  updatedAt: string;
};
