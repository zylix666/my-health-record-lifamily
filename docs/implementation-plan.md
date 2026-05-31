# Implementation Plan for Codex

## Step 1: Project Setup

Create a React + TypeScript + Vite project.

Install recommended packages:

- dexie
- recharts
- vite-plugin-pwa
- uuid or nanoid

Optional:

- tailwindcss
- date-fns

## Step 2: Type Definitions

Implement files under:

```text
src/types
```

Use the provided TypeScript definitions as source of truth.

## Step 3: IndexedDB Repository

Implement Dexie database according to:

```text
src/storage/db.schema.ts
src/storage/repository.contract.ts
```

Repository must support:

- Food CRUD
- IntakeRecord CRUD
- DailyGoal get/save
- DailyCheckIn get/save
- Settings get/save
- Backup export/import

## Step 4: Domain Logic

Implement pure calculation functions first.

Required:

- calculateRecordNutrition
- createIntakeRecordFromFood
- calculateDailyTotal
- calculateGap
- calculateGoalProgress
- shouldShowAfternoonGapCheck
- buildAfternoonGapCheck

## Step 5: UI Pages

Implement pages in this order:

1. Food Database
2. Add Intake Record
3. Dashboard
4. Daily Detail / Timeline
5. Settings / Data Management
6. Charts
7. Review / Insights

## Step 6: PWA Setup

Add:

- vite-plugin-pwa
- manifest
- service worker
- offline app shell caching

## Step 7: Import / Export

Implement JSON export/import using BackupPayload.

Must validate:

- schemaVersion
- required top-level keys
- basic shape of food and intake record arrays

## Step 8: Testing Scenarios

Manual test cases:

1. Add food item
2. Add intake record from food item
3. Confirm daily totals update
4. Edit food item and confirm old intake record does not change
5. Delete food item and confirm old intake record remains
6. After 16:00, confirm gap check card appears
7. Dismiss gap check and confirm it does not reappear same day
8. Export JSON
9. Clear data
10. Import JSON and confirm data restored
11. Refresh browser and confirm data persists
12. Turn off internet and confirm app shell opens
