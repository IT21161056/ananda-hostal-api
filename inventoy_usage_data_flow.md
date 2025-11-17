# Inventory Usage System - Data Flow & UI Components

## Overview

This document explains exactly how data flows through the system and which UI components are involved in the automated inventory deduction process.

---

## 🔄 Complete Data Flow

### 1. **ATTENDANCE DATA** (Required for calculations)

**UI Component:** `AttendanceTracker.tsx`

- **Location:** `/attendance` page → "Mark Attendance" tab
- **File:** `frontend/src/components/Attendance/AttendanceTracker.tsx`
- **What it does:**
  - Staff records morning and evening attendance sessions
  - Stores: `sessionType` (morning/evening), `presentCount`, `markedAt` (date)
  - **API:** `POST /api/v1/attendance` via `useCreateAttendance()`
  - **Backend Model:** `AttendanceSession`

**Key Data Collected:**

```typescript
{
  sessionType: "morning" | "evening",
  presentCount: number,  // Number of students present
  markedAt: Date,        // Date of attendance
  attendanceRecords: [...]
}
```

---

### 2. **MEAL PLAN DATA** (Defines what inventory is needed)

**UI Component:** `MealPlanWeek.tsx`

- **Location:** `/meals` page → "Meal Planning" tab
- **File:** `frontend/src/components/Meals/MealPlanWeek.tsx`
- **What it does:**
  - Kitchen staff creates weekly meal plans (Monday-Sunday)
  - For each day, defines:
    - Breakfast items (food names)
    - Lunch items (food names)
    - Dinner items (food names)
    - **Inventory items needed** for each meal with quantities
  - **API:** `POST /api/v1/mealplan` via `useCreateMealPlan()`
  - **Backend Model:** `MealPlan`

**Key Data Collected:**

```typescript
{
  day: "Monday" | "Tuesday" | ... | "Sunday",
  breakfast: string[],           // Food names
  lunch: string[],
  dinner: string[],
  breakfastInventory: [          // Inventory items for breakfast
    {
      inventoryItemId: string,
      quantity: number           // Quantity for 10 students (baseline)
    }
  ],
  lunchInventory: [...],
  dinnerInventory: [...],
  estimatedCost: number
}
```

**UI Features:**

- Line 135: Fetches all inventory items: `useGetAllInventoryItems({ limit: 1000 })`
- Lines 612-644: Inventory selection component for each meal
- Lines 733-750: Edit mode inventory selection

---

### 3. **INVENTORY ITEMS** (Master list of available items)

**UI Component:** `InventoryManagement.tsx`

- **Location:** `/meals` page → "Inventory Management" tab
- **File:** `frontend/src/components/Meals/InventoryManagement.tsx`
- **What it does:**
  - Kitchen staff manages inventory items (create, update, delete)
  - Tracks: name, category, currentStock, unit, minimumStock, costPerUnit
  - **API:** `GET/POST/PUT/DELETE /api/v1/inventory` via inventory hooks
  - **Backend Model:** `InventoryItem`

**Key Data Collected:**

```typescript
{
  _id: string,
  name: string,              // e.g., "Rice", "Chicken"
  category: "vegetables" | "grains" | "dairy" | "spices" | "other",
  currentStock: number,      // Current available quantity
  unit: string,              // e.g., "kg", "liters"
  minimumStock: number,      // Alert threshold
  costPerUnit: number
}
```

**UI Features:**

- Line 58: Fetches inventory: `useGetAllInventoryItems()`
- Lines 646-825: Add/Edit modal for inventory items

---

### 4. **MANUAL INVENTORY USAGE RECORDING** (Optional - for manual entry)

**UI Component:** `InventoryUsageRecorder.tsx`

- **Location:** `/meals` page → "Record Usage" tab
- **File:** `frontend/src/components/Meals/InventoryUsageRecorder.tsx`
- **What it does:**
  - Kitchen staff can manually record inventory usage
  - Selects date, meal type, and items used
  - System calculates actual usage based on attendance
  - **API:** `POST /api/v1/inventory-usage` via `useRecordInventoryUsage()`
  - **Backend Model:** `InventoryUsage`

**Key Data Collected:**

```typescript
{
  date: string,              // YYYY-MM-DD
  mealType: "breakfast" | "lunch" | "dinner",
  items: [
    {
      inventoryItemId: string,
      recordedQuantity: number,      // Quantity used for X students
      recordedForStudents: 1 | 10    // 1 student or 10 students
    }
  ],
  notes?: string
}
```

**UI Features:**

- Line 37: Fetches inventory items: `useGetAllInventoryItems({ limit: 1000 })`
- Lines 40-48: Fetches attendance info: `useGetAttendanceInfo({ date, mealType })`
- Lines 200-250: Shows attendance information display
- Lines 260-380: Dynamic form to add multiple inventory items

---

## 🤖 AUTOMATED CRON JOB FLOW

### How the Cron Job Gets Data:

**File:** `backend/utils/cronJobs.js`

#### Step 1: Get Meal Plan

```javascript
// Line 69: Gets today's meal plan
const mealPlan = await MealPlan.findOne({ day: dayName });
// Uses: dayName from current date (Monday, Tuesday, etc.)
```

#### Step 2: Get Attendance

```javascript
// Lines 78-88: Determines which attendance to use
if (mealType === "breakfast" || mealType === "lunch") {
  // Use previous day's evening attendance
  attendanceDate.setDate(attendanceDate.getDate() - 1);
}
// For dinner: use current day's evening attendance

// Line 91: Gets attendance count
const attendanceCount = await getAttendanceCount(
  attendanceSessionType, // "evening"
  attendanceDate
);
```

#### Step 3: Calculate & Deduct

```javascript
// Lines 164-167: Calculate actual usage
const baseQuantity = item.quantity; // From meal plan
const standardGroupSize = 10; // Assumes meal plan is for 10 students
const quantityToConsume = (attendanceCount / standardGroupSize) * baseQuantity;

// Lines 183-185: Deduct from inventory
inventoryItem.currentStock -= quantityToConsume;
await inventoryItem.save();
```

#### Step 4: Create Usage Record

```javascript
// Lines 213-221: Creates audit trail
await InventoryUsage.create({
  date: dateObj,
  mealType: mealType,
  items: usageItems,
  attendanceCount: attendanceCount,
  attendanceSessionId: attendanceSession?._id,
  recordedBy: systemUser._id,
  notes: "Automated deduction via cron job",
});
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    UI COMPONENTS                             │
└─────────────────────────────────────────────────────────────┘

1. AttendanceTracker.tsx
   └─> Records: sessionType, presentCount, date
       └─> Saves to: AttendanceSession (Database)

2. MealPlanWeek.tsx
   └─> Records: day, breakfast/lunch/dinner, inventory items + quantities
       └─> Saves to: MealPlan (Database)

3. InventoryManagement.tsx
   └─> Manages: Inventory items (name, stock, unit, etc.)
       └─> Saves to: InventoryItem (Database)

4. InventoryUsageRecorder.tsx (Optional Manual Entry)
   └─> Records: date, mealType, items used
       └─> Saves to: InventoryUsage (Database)
       └─> Deducts from: InventoryItem.currentStock

┌─────────────────────────────────────────────────────────────┐
│                    AUTOMATED CRON JOB                        │
└─────────────────────────────────────────────────────────────┘

Cron Job (cronJobs.js) - Runs at scheduled times:
├─> 7:00 AM: consumeInventoryForMeal("breakfast")
├─> 11:00 AM: consumeInventoryForMeal("lunch")
└─> 5:00 PM: consumeInventoryForMeal("dinner")

For each meal:
1. Reads: MealPlan (by day of week)
2. Reads: AttendanceSession (previous day evening for breakfast/lunch,
                              current day evening for dinner)
3. Calculates: (attendanceCount / 10) * mealPlanQuantity
4. Updates: InventoryItem.currentStock (deducts)
5. Creates: InventoryUsage record (audit trail)
```

---

## 🔍 Key API Endpoints Used

### Frontend → Backend

1. **Attendance:**

   - `GET /api/v1/attendance` - Get attendance sessions
   - `POST /api/v1/attendance` - Create attendance session
   - `GET /api/v1/inventory-usage/attendance-info` - Get attendance for specific date/meal

2. **Meal Plans:**

   - `GET /api/v1/mealplan` - Get all meal plans
   - `POST /api/v1/mealplan` - Create meal plan
   - `PUT /api/v1/mealplan/:id` - Update meal plan

3. **Inventory:**

   - `GET /api/v1/inventory` - Get all inventory items
   - `POST /api/v1/inventory` - Create inventory item
   - `PUT /api/v1/inventory/:id` - Update inventory item

4. **Inventory Usage:**
   - `POST /api/v1/inventory-usage` - Record manual usage
   - `GET /api/v1/inventory-usage` - Get usage records

---

## 📝 Summary

**For Automated Deduction to Work, You Need:**

1. ✅ **Meal Plans** created in `MealPlanWeek.tsx` with inventory items
2. ✅ **Attendance** recorded in `AttendanceTracker.tsx` (evening sessions)
3. ✅ **Inventory Items** managed in `InventoryManagement.tsx`
4. ✅ **Cron Job** runs automatically at scheduled times

**The cron job automatically:**

- Finds today's meal plan
- Gets the correct attendance (previous day evening for breakfast/lunch)
- Calculates actual usage based on attendance
- Deducts from inventory
- Creates usage records for tracking

**Manual recording** via `InventoryUsageRecorder.tsx` is optional and works the same way, but triggered by user action instead of cron schedule.
