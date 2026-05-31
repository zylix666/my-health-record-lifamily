# UI Page Requirements

## 1. Dashboard Page

Purpose:

Show today’s status and direct user to immediate actions.

Required UI blocks:

- Today’s date
- Today’s water total and goal progress
- Today’s dietary fiber total and goal progress
- Today’s protein total and goal progress
- Button: Add Intake Record
- Button: View Daily Detail
- Afternoon gap check reminder card after 16:00 if applicable

Required behavior:

- Recalculate totals after every record change
- Show progress percentage for each metric
- If all goals are reached, show positive completion state

## 2. Add Intake Record Page

Purpose:

Fast mobile-first logging.

Required three-level dropdown UI:

1. Hour dropdown
   - Values: 00:00 through 23:00
   - Default: current local hour

2. Food category dropdown
   - Required categories:
     - 主食 / staple
     - 蛋白質 / protein
     - 蔬菜 / vegetable
     - 水果 / fruit
     - 飲料 / beverage
     - 乳製品 / dairy
     - 點心 / snack
     - 其他 / other

3. Food item dropdown
   - Filtered by selected category
   - Shows food name and serving name

Additional fields:

- Quantity input, default 1
- Auto-calculated water/fiber/protein preview
- Optional note
- Save button
- Cancel button

Required behavior:

- Food item dropdown must be disabled until category is selected
- Nutrient preview updates when quantity changes
- Saving record must snapshot food data and nutrient values

## 3. Daily Detail / Timeline Page

Purpose:

Support user review and behavior reflection.

Required UI blocks:

- Date picker
- Daily totals
- Goal gaps
- Timeline grouped or sorted by hour
- Each record row displays:
  - Time
  - Category
  - Food name
  - Quantity
  - Water/fiber/protein contribution
  - Note if available
- Edit and delete action for each record

Required behavior:

- Records sorted by hour and then createdAt
- Editing a record should preserve snapshot rules
- Deleting a record updates daily totals immediately

## 4. Review / Insights Page

Purpose:

Help user understand patterns.

MVP insights:

- Last 7 days average water/fiber/protein
- Last 14 days goal achievement rate
- Most frequently consumed foods
- Most common insufficient metric

Future insights:

- Weekday vs weekend pattern
- Morning/afternoon/evening intake pattern
- Correlation with tags such as sleep, exercise, stress

## 5. Food Database Page

Purpose:

Manage reusable food items.

Required features:

- List food items
- Filter by category
- Search by name
- Add food item
- Edit food item
- Delete food item

Required food item fields:

- Name
- Category
- Serving name
- Serving amount
- Serving unit
- Water ml
- Fiber g
- Protein g
- Optional note

Deletion rule:

- Deleting a food item must not delete historical intake records
- Historical records are preserved through snapshots

## 6. Charts Page

Purpose:

Simple visual review.

Required charts:

- 7-day trend line chart for water/fiber/protein
- 30-day trend line chart for water/fiber/protein
- Goal achievement status by day

Recommended library:

- Recharts

## 7. Settings / Data Management Page

Required features:

- Edit daily water goal
- Edit daily fiber goal
- Edit daily protein goal
- Enable/disable 16:00 gap check
- Export JSON backup
- Import JSON backup
- Clear all data with confirmation

Import behavior:

- Validate schemaVersion
- Show warning before overwrite/merge
- Do not silently delete existing data
