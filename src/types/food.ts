export type FoodCategory =
  | "dairy"
  | "soy"
  | "grain"
  | "functional"
  | "meat"
  | "fish"
  | "vegetable"
  | "fruit"
  | "snack"
  | "convenience"
  | "beverage"
  // Legacy categories kept so old local records/backups still render labels.
  | "staple"
  | "protein"
  | "other";

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  dairy: "乳製品",
  soy: "豆類製品",
  grain: "穀物主食",
  functional: "機能食品",
  meat: "肉類",
  fish: "魚類",
  vegetable: "蔬菜",
  fruit: "水果",
  beverage: "飲品",
  snack: "零食點心",
  convenience: "便利商店",
  staple: "主食",
  protein: "蛋白質",
  other: "其他",
};

export const FOOD_CATEGORIES: FoodCategory[] = [
  "dairy",
  "soy",
  "grain",
  "functional",
  "meat",
  "fish",
  "vegetable",
  "fruit",
  "snack",
  "convenience",
  "beverage",
];

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
