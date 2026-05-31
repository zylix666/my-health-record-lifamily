# Health Record PWA Spec

## 1. Product Goal

Build a local-first Progressive Web App (PWA) for daily health intake tracking. The app focuses on three core metrics:

- Water intake, measured in ml
- Dietary fiber intake, measured in g
- Protein intake, measured in g

The app is not just a dashboard for goal achievement. It must help users review and understand their daily behavior through detailed intake records, timelines, simple charts, and afternoon gap checks.

## 2. Product Positioning

This is a local-first personal nutrition and lifestyle review tool.

Primary goals:

- Fast daily logging on mobile
- Food database for reusable food items
- Detailed daily records for review
- Daily total calculation
- Simple charts and trend review
- 16:00 daily gap check before dinner
- JSON import/export for data ownership and migration
- Offline-first usage without requiring a backend server

## 3. MVP Scope

### Must Have

1. PWA installable on mobile devices
2. Local data storage using IndexedDB
3. Food database CRUD
4. Intake record creation using a three-level dropdown UI
5. Daily total calculation
6. Daily detailed timeline view
7. Dashboard with today’s totals and goal progress
8. 16:00 daily gap check
9. Simple charts for 7-day and 30-day trends
10. JSON export/import
11. Daily goal settings

### Nice to Have Later

1. CSV export
2. Cloud sync
3. Account login
4. Push notification
5. Food templates or recommended foods
6. AI-based suggestions
7. Barcode scanning

## 4. Non-goals for MVP

The MVP should not include:

- Backend database
- User account system
- Multi-device sync
- App Store or Google Play deployment
- Medical advice engine
- Calorie tracking unless explicitly added later
- Complex nutrition database integration

## 5. Recommended Technical Stack

- React
- TypeScript
- Vite
- vite-plugin-pwa
- IndexedDB
- Dexie.js as IndexedDB wrapper
- Recharts for charts
- CSS or Tailwind CSS for mobile-first UI

## 6. Architecture

```text
React PWA Frontend
  ├── UI Pages
  ├── Domain Services
  ├── IndexedDB via Dexie
  ├── JSON Import / Export
  └── PWA Service Worker
```

There is no backend in the MVP. All data is stored locally in the user’s browser/device.

## 7. Core Pages

1. Dashboard
2. Add Intake Record
3. Daily Detail / Timeline
4. Review / Insights
5. Food Database
6. Charts
7. Settings / Data Management

## 8. Core Data Entities

- FoodItem
- IntakeRecord
- DailyGoal
- DailyCheckIn
- AppSettings
- BackupPayload

See `src/types/*.ts` for detailed TypeScript definitions.

## 9. Important Design Principle: Snapshot Records

When the user creates an intake record from a food item, the app must snapshot the food name, category, serving information, and nutrient values into the intake record.

Reason:

If the user later edits the food database, historical intake records must not be unintentionally changed.

Example:

If “義美高纖豆乳” changes from protein 15g to 20g later, old records should still preserve the original 15g value.

## 10. Add Intake UI Requirement

The add intake screen must use at least a three-level dropdown flow:

1. Hour selection, every hour from 00:00 to 23:00
2. Food category selection, such as staple, vegetable, fruit, beverage, etc.
3. Food item selection filtered by selected category

After food item selection:

- User enters quantity
- App calculates water, fiber, and protein based on quantity
- User may add optional notes
- User confirms and saves the record

## 11. 16:00 Daily Gap Check

Every day after 16:00, the app should check today’s intake against daily goals.

It should show the remaining gap for:

- Water
- Dietary fiber
- Protein

Purpose:

Help the user use the final meal of the day to compensate for insufficient intake.

MVP implementation:

- App-level reminder card shown when user opens the app after 16:00
- Do not require push notification in MVP
- Store whether the user has checked/dismissed today’s gap check

## 12. Data Ownership and Migration

The app must support:

- Export all data to JSON
- Import from JSON
- Validate backup schema version
- Avoid silent overwrite without warning

Recommended backup file name:

```text
health-record-backup-YYYY-MM-DD.json
```

## 13. Acceptance Criteria

MVP is acceptable when:

1. User can create/edit/delete food items
2. User can create/edit/delete intake records
3. User can select hour/category/food item when adding records
4. Dashboard shows today’s totals and progress
5. Daily detail page shows records sorted by hour/time
6. Charts show recent 7-day and 30-day trends
7. After 16:00, app shows daily gap check if not already checked
8. Export/import JSON works
9. App works offline after first load
10. Historical records are not affected when food item definitions are edited
