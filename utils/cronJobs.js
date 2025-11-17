import cron from "node-cron";
import mongoose from "mongoose";
import InventoryItem from "../models/inventory.model.js";
import MealPlan from "../models/mealplan.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import AttendanceSession from "../models/attendanceSession.model.js";
import Student from "../models/student.model.js";
import InventoryUsage from "../models/inventoryUsage.model.js";

/**
 * @desc    Get attendance count for today based on session type
 * @desc    Returns the number of students present for a given session
 */
const getAttendanceCount = async (sessionType, date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attendanceSession = await AttendanceSession.findOne({
      sessionType,
      markedAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (attendanceSession) {
      return attendanceSession.presentCount || 0;
    }

    return null; // No attendance recorded yet
  } catch (error) {
    console.error(
      `[Cron Job] Error getting attendance for ${sessionType}:`,
      error
    );
    return null;
  }
};

/**
 * @desc    Consume inventory for a specific meal based on meal plan and attendance
 * @desc    This function handles the logic for consuming inventory for breakfast, lunch, or dinner
 * @desc    Morning meals (breakfast/lunch) use previous day's evening attendance
 * @desc    Evening meals (dinner) use current day's evening attendance
 */
const consumeInventoryForMeal = async (mealType, date = new Date()) => {
  try {
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dateObj = new Date(date);
    const dayName = dayNames[dateObj.getDay()];

    console.log(
      `[Cron Job] Starting inventory consumption for ${mealType} on ${dayName}...`
    );

    // Find today's meal plan
    const mealPlan = await MealPlan.findOne({ day: dayName });

    if (!mealPlan) {
      console.log(
        `[Cron Job] No meal plan found for ${dayName}. Skipping ${mealType} inventory consumption.`
      );
      return;
    }

    // Determine which attendance session to use
    // Morning meals (breakfast, lunch) use previous day's evening attendance
    // Evening meals (dinner) use current day's evening attendance
    let attendanceDate = new Date(dateObj);
    let attendanceSessionType = "evening";

    if (mealType === "breakfast" || mealType === "lunch") {
      // Use previous day's evening attendance
      attendanceDate.setDate(attendanceDate.getDate() - 1);
    }
    // For dinner, use current day's evening attendance (already set)

    // Get attendance count
    const attendanceCount = await getAttendanceCount(
      attendanceSessionType,
      attendanceDate
    );

    if (attendanceCount === null || attendanceCount === 0) {
      console.log(
        `[Cron Job] No ${attendanceSessionType} attendance found for ${attendanceDate.toLocaleDateString()}. Skipping ${mealType} inventory consumption.`
      );
      return;
    }

    // Get the attendance session for reference
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    const attendanceSession = await AttendanceSession.findOne({
      sessionType: attendanceSessionType,
      markedAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    // Get meal inventory based on meal type
    const mealInventory =
      mealType === "breakfast"
        ? mealPlan.breakfastInventory
        : mealType === "lunch"
        ? mealPlan.lunchInventory
        : mealPlan.dinnerInventory;

    if (!mealInventory || mealInventory.length === 0) {
      console.log(
        `[Cron Job] No ${mealType} inventory items in meal plan. Skipping.`
      );
      return;
    }

    const consumptionUpdates = [];
    const errors = [];
    const usageItems = [];

    // Get system user (admin) for recording usage
    const systemUser = await User.findOne({ role: "admin" });
    if (!systemUser) {
      console.error(
        "[Cron Job] No admin user found. Cannot record inventory usage."
      );
      return;
    }

    // Process inventory items
    for (const item of mealInventory) {
      try {
        const inventoryItem = await InventoryItem.findById(
          item.inventoryItemId
        );
        if (!inventoryItem) {
          errors.push(
            `${mealType}: Inventory item ${item.inventoryItemId} not found`
          );
          continue;
        }

        // Calculate actual usage based on attendance
        // The meal plan quantity is for a specific number of students (item.forStudents)
        // We scale it based on actual attendance
        const baseQuantity = item.quantity;
        const forStudents = item.forStudents || 10; // Default to 10 if not specified
        const quantityToConsume =
          (attendanceCount / forStudents) * baseQuantity;

        if (inventoryItem.currentStock < quantityToConsume) {
          errors.push(
            `${mealType}: Insufficient stock for ${
              inventoryItem.name
            }. Available: ${inventoryItem.currentStock.toFixed(2)} ${
              inventoryItem.unit
            }, Required: ${quantityToConsume.toFixed(2)} ${
              inventoryItem.unit
            } (Attendance: ${attendanceCount})`
          );
          continue;
        }

        // Deduct inventory
        inventoryItem.currentStock -= quantityToConsume;
        inventoryItem.lastUpdated = new Date();
        await inventoryItem.save();

        consumptionUpdates.push({
          meal: mealType,
          item: inventoryItem.name,
          baseQuantity: baseQuantity,
          quantity: quantityToConsume,
          attendance: attendanceCount,
          remainingStock: inventoryItem.currentStock,
        });

        // Prepare usage record item
        usageItems.push({
          inventoryItemId: inventoryItem._id,
          recordedQuantity: baseQuantity,
          recordedForStudents: forStudents,
          actualQuantityDeducted: quantityToConsume,
        });
      } catch (error) {
        errors.push(
          `${mealType}: Error processing ${item.inventoryItemId}: ${error.message}`
        );
      }
    }

    // Create inventory usage record
    if (usageItems.length > 0) {
      try {
        await InventoryUsage.create({
          date: dateObj,
          mealType: mealType,
          items: usageItems,
          attendanceCount: attendanceCount,
          attendanceSessionId: attendanceSession?._id || null,
          recordedBy: systemUser._id,
          notes: `Automated deduction via cron job`,
        });
        console.log(
          `[Cron Job] Created inventory usage record for ${mealType}`
        );
      } catch (error) {
        console.error(
          `[Cron Job] Error creating usage record: ${error.message}`
        );
      }
    }

    // Log results
    if (consumptionUpdates.length > 0) {
      console.log(
        `[Cron Job] Successfully consumed inventory for ${mealType} (${consumptionUpdates.length} items):`
      );
      consumptionUpdates.forEach((update) => {
        console.log(
          `  - ${update.item} - Base: ${update.baseQuantity.toFixed(
            2
          )}, Consumed: ${update.quantity.toFixed(2)} (Att: ${
            update.attendance
          }), Remaining: ${update.remainingStock.toFixed(2)}`
        );
      });
    }

    if (errors.length > 0) {
      console.error(`[Cron Job] Errors for ${mealType}:`);
      errors.forEach((error) => console.error(`  - ${error}`));

      // Create notifications for errors
      const adminUsers = await User.find({ role: "admin" });
      for (const admin of adminUsers) {
        await Notification.create({
          user: admin._id,
          type: "alert",
          title: `Inventory Consumption Error - ${mealType} (${dayName})`,
          message: `Errors: ${errors.join("; ")}`,
          read: false,
        });
      }
    }
  } catch (error) {
    console.error(
      `[Cron Job] Error in consumeInventoryForMeal (${mealType}):`,
      error
    );
  }
};

/**
 * @desc    Consume inventory based on today's meal plan and actual attendance
 * @desc    This job runs daily to automatically reduce inventory based on meal plans
 * @desc    Quantities are adjusted based on actual attendance counts
 * @desc    DEPRECATED: Use consumeInventoryForMeal instead for better control
 */
const consumeInventoryFromMealPlans = async () => {
  try {
    const today = new Date();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todayName = dayNames[today.getDay()];

    console.log(
      `[Cron Job] Starting inventory consumption for ${todayName}...`
    );

    // Find today's meal plan
    const mealPlan = await MealPlan.findOne({ day: todayName });

    if (!mealPlan) {
      console.log(
        `[Cron Job] No meal plan found for ${todayName}. Skipping inventory consumption.`
      );
      return;
    }

    // Get total student count for baseline calculation
    const totalStudents = await Student.countDocuments({});
    if (totalStudents === 0) {
      console.log(
        `[Cron Job] No students found in the system. Skipping inventory consumption.`
      );
      return;
    }

    // Get attendance counts - using correct logic
    // Breakfast and lunch use previous day's evening attendance
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const previousDayEveningAttendance = await getAttendanceCount(
      "evening",
      yesterday
    );

    // Dinner uses current day's evening attendance
    const todayEveningAttendance = await getAttendanceCount("evening", today);

    // Calculate attendance multipliers for each meal
    // If attendance not recorded, skip that meal (don't consume)
    const breakfastMultiplier =
      previousDayEveningAttendance !== null && previousDayEveningAttendance > 0
        ? previousDayEveningAttendance / totalStudents
        : null;

    const lunchMultiplier =
      previousDayEveningAttendance !== null && previousDayEveningAttendance > 0
        ? previousDayEveningAttendance / totalStudents
        : null;

    const dinnerMultiplier =
      todayEveningAttendance !== null && todayEveningAttendance > 0
        ? todayEveningAttendance / totalStudents
        : null;

    console.log(
      `[Cron Job] Attendance - Total Students: ${totalStudents}, Previous Day Evening: ${
        previousDayEveningAttendance !== null
          ? previousDayEveningAttendance
          : "Not recorded"
      }, Today Evening: ${
        todayEveningAttendance !== null
          ? todayEveningAttendance
          : "Not recorded"
      }`
    );
    console.log(
      `[Cron Job] Multipliers - Breakfast: ${
        breakfastMultiplier !== null ? breakfastMultiplier.toFixed(2) : "N/A"
      }, Lunch: ${
        lunchMultiplier !== null ? lunchMultiplier.toFixed(2) : "N/A"
      }, Dinner: ${
        dinnerMultiplier !== null ? dinnerMultiplier.toFixed(2) : "N/A"
      }`
    );

    const consumptionUpdates = [];
    const errors = [];
    const warnings = [];

    // Warn if attendance not recorded
    if (previousDayEveningAttendance === null) {
      warnings.push(
        "Previous day evening attendance not recorded - skipping breakfast and lunch"
      );
    }
    if (todayEveningAttendance === null) {
      warnings.push("Today evening attendance not recorded - skipping dinner");
    }

    // Process breakfast inventory
    if (mealPlan.breakfastInventory && mealPlan.breakfastInventory.length > 0) {
      for (const item of mealPlan.breakfastInventory) {
        try {
          const inventoryItem = await InventoryItem.findById(
            item.inventoryItemId
          );
          if (!inventoryItem) {
            errors.push(
              `Breakfast: Inventory item ${item.inventoryItemId} not found`
            );
            continue;
          }

          // Calculate quantity based on attendance
          if (breakfastMultiplier === null) {
            continue; // Skip if no attendance
          }
          const baseQuantity = item.quantity;
          const quantityToConsume = baseQuantity * breakfastMultiplier;

          if (inventoryItem.currentStock < quantityToConsume) {
            errors.push(
              `Breakfast: Insufficient stock for ${
                inventoryItem.name
              }. Available: ${inventoryItem.currentStock.toFixed(
                2
              )}, Required: ${quantityToConsume.toFixed(
                2
              )} (Base: ${baseQuantity}, Att: ${
                previousDayEveningAttendance !== null
                  ? previousDayEveningAttendance
                  : "N/A"
              })`
            );
            continue;
          }

          inventoryItem.currentStock -= quantityToConsume;
          inventoryItem.lastUpdated = new Date();
          await inventoryItem.save();

          consumptionUpdates.push({
            meal: "Breakfast",
            item: inventoryItem.name,
            baseQuantity: baseQuantity,
            quantity: quantityToConsume,
            attendance: previousDayEveningAttendance,
            remainingStock: inventoryItem.currentStock,
          });
        } catch (error) {
          errors.push(
            `Breakfast: Error processing ${item.inventoryItemId}: ${error.message}`
          );
        }
      }
    }

    // Process lunch inventory
    if (mealPlan.lunchInventory && mealPlan.lunchInventory.length > 0) {
      for (const item of mealPlan.lunchInventory) {
        try {
          const inventoryItem = await InventoryItem.findById(
            item.inventoryItemId
          );
          if (!inventoryItem) {
            errors.push(
              `Lunch: Inventory item ${item.inventoryItemId} not found`
            );
            continue;
          }

          // Calculate quantity based on attendance
          if (lunchMultiplier === null) {
            continue; // Skip if no attendance
          }
          const baseQuantity = item.quantity;
          const quantityToConsume = baseQuantity * lunchMultiplier;

          if (inventoryItem.currentStock < quantityToConsume) {
            errors.push(
              `Lunch: Insufficient stock for ${
                inventoryItem.name
              }. Available: ${inventoryItem.currentStock.toFixed(
                2
              )}, Required: ${quantityToConsume.toFixed(
                2
              )} (Base: ${baseQuantity}, Att: ${
                previousDayEveningAttendance !== null
                  ? previousDayEveningAttendance
                  : "N/A"
              })`
            );
            continue;
          }

          inventoryItem.currentStock -= quantityToConsume;
          inventoryItem.lastUpdated = new Date();
          await inventoryItem.save();

          consumptionUpdates.push({
            meal: "Lunch",
            item: inventoryItem.name,
            baseQuantity: baseQuantity,
            quantity: quantityToConsume,
            attendance: previousDayEveningAttendance,
            remainingStock: inventoryItem.currentStock,
          });
        } catch (error) {
          errors.push(
            `Lunch: Error processing ${item.inventoryItemId}: ${error.message}`
          );
        }
      }
    }

    // Process dinner inventory
    if (mealPlan.dinnerInventory && mealPlan.dinnerInventory.length > 0) {
      for (const item of mealPlan.dinnerInventory) {
        try {
          const inventoryItem = await InventoryItem.findById(
            item.inventoryItemId
          );
          if (!inventoryItem) {
            errors.push(
              `Dinner: Inventory item ${item.inventoryItemId} not found`
            );
            continue;
          }

          // Calculate quantity based on attendance
          if (dinnerMultiplier === null) {
            continue; // Skip if no attendance
          }
          const baseQuantity = item.quantity;
          const quantityToConsume = baseQuantity * dinnerMultiplier;

          if (inventoryItem.currentStock < quantityToConsume) {
            errors.push(
              `Dinner: Insufficient stock for ${
                inventoryItem.name
              }. Available: ${inventoryItem.currentStock.toFixed(
                2
              )}, Required: ${quantityToConsume.toFixed(
                2
              )} (Base: ${baseQuantity}, Att: ${
                eveningAttendance !== null ? eveningAttendance : "N/A"
              })`
            );
            continue;
          }

          inventoryItem.currentStock -= quantityToConsume;
          inventoryItem.lastUpdated = new Date();
          await inventoryItem.save();

          consumptionUpdates.push({
            meal: "Dinner",
            item: inventoryItem.name,
            baseQuantity: baseQuantity,
            quantity: quantityToConsume,
            attendance: eveningAttendance,
            remainingStock: inventoryItem.currentStock,
          });
        } catch (error) {
          errors.push(
            `Dinner: Error processing ${item.inventoryItemId}: ${error.message}`
          );
        }
      }
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn(`[Cron Job] Warnings:`);
      warnings.forEach((warning) => console.warn(`  - ${warning}`));
    }

    // Log results
    if (consumptionUpdates.length > 0) {
      console.log(
        `[Cron Job] Successfully consumed inventory for ${consumptionUpdates.length} items:`
      );
      consumptionUpdates.forEach((update) => {
        console.log(
          `  - ${update.meal}: ${
            update.item
          } - Base: ${update.baseQuantity.toFixed(
            2
          )}, Consumed: ${update.quantity.toFixed(2)} (Att: ${
            update.attendance !== null ? update.attendance : "N/A"
          }), Remaining: ${update.remainingStock.toFixed(2)}`
        );
      });
    }

    if (errors.length > 0) {
      console.error(`[Cron Job] Errors occurred:`);
      errors.forEach((error) => console.error(`  - ${error}`));
    }

    // Create notifications for errors and warnings (send to admin users)
    if (errors.length > 0 || warnings.length > 0) {
      const adminUsers = await User.find({ role: "admin" });
      const notificationMessages = [];

      if (warnings.length > 0) {
        notificationMessages.push(`Warnings: ${warnings.join("; ")}`);
      }

      if (errors.length > 0) {
        notificationMessages.push(`Errors: ${errors.join("; ")}`);
      }

      for (const admin of adminUsers) {
        await Notification.create({
          user: admin._id,
          type: errors.length > 0 ? "alert" : "warning",
          title: `Inventory Consumption ${
            errors.length > 0 ? "Errors" : "Warnings"
          } - ${todayName}`,
          message: notificationMessages.join(" | "),
          read: false,
        });
      }
    }
  } catch (error) {
    console.error("[Cron Job] Error in consumeInventoryFromMealPlans:", error);
  }
};

/**
 * @desc    Check for low stock items and send notifications
 * @desc    This job runs periodically to check inventory levels
 */
const checkLowStockItems = async () => {
  try {
    console.log("[Cron Job] Checking for low stock items...");

    const inventoryItems = await InventoryItem.find({});

    const lowStockItems = inventoryItems.filter(
      (item) => item.currentStock <= item.minimumStock
    );

    if (lowStockItems.length === 0) {
      console.log("[Cron Job] No low stock items found.");
      return;
    }

    console.log(
      `[Cron Job] Found ${lowStockItems.length} items with low stock.`
    );

    // Get admin and kitchen staff users
    const adminUsers = await User.find({ role: { $in: ["admin", "kitchen"] } });

    // Create notifications for each low stock item
    for (const item of lowStockItems) {
      const stockStatus =
        item.currentStock === 0 ? "out of stock" : "below minimum level";

      for (const user of adminUsers) {
        // Check if notification for this item already exists today
        const existingNotification = await Notification.findOne({
          user: user._id,
          title: `Low Stock: ${item.name}`,
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        });

        if (!existingNotification) {
          await Notification.create({
            user: user._id,
            type: item.currentStock === 0 ? "alert" : "warning",
            title: `Low Stock: ${item.name}`,
            message: `${item.name} is ${stockStatus}. Current stock: ${item.currentStock} ${item.unit}, Minimum required: ${item.minimumStock} ${item.unit}.`,
            read: false,
          });
        }
      }
    }

    console.log(
      `[Cron Job] Low stock notifications sent for ${lowStockItems.length} items.`
    );
  } catch (error) {
    console.error("[Cron Job] Error in checkLowStockItems:", error);
  }
};

/**
 * @desc    Initialize and start all cron jobs
 * @desc    Schedule patterns can be configured here
 */
const initializeCronJobs = () => {
  // Wait for database connection before initializing cron jobs
  if (mongoose.connection.readyState !== 1) {
    console.log("[Cron Jobs] Waiting for database connection...");
    mongoose.connection.once("connected", () => {
      console.log("[Cron Jobs] Database connected. Initializing cron jobs...");
      setupCronJobs();
    });
  } else {
    setupCronJobs();
  }
};

/**
 * @desc    Setup and schedule all cron jobs
 */
const setupCronJobs = () => {
  // Cron schedule patterns
  const schedules = {
    // Breakfast inventory consumption - runs at 7:00 AM every day
    // Format: minute hour day month dayOfWeek
    breakfastConsumption: process.env.CRON_BREAKFAST_CONSUMPTION || "0 7 * * *",

    // Lunch inventory consumption - runs at 11:00 AM every day
    lunchConsumption: process.env.CRON_LUNCH_CONSUMPTION || "0 11 * * *",

    // Dinner inventory consumption - runs at 5:00 PM every day
    // Note: This runs before dinner, but uses current day's evening attendance
    // which should be recorded earlier in the day
    dinnerConsumption: process.env.CRON_DINNER_CONSUMPTION || "0 17 * * *",

    // Legacy: Daily inventory consumption - runs at 6:00 AM every day (all meals at once)
    // This is kept for backward compatibility but uses the new per-meal function
    dailyConsumption: process.env.CRON_INVENTORY_CONSUMPTION || "0 6 * * *",

    // Low stock check - runs every 4 hours
    // Change to "0 */4 * * *" for every 4 hours, or "0 9,17 * * *" for 9 AM and 5 PM
    lowStockCheck: process.env.CRON_LOW_STOCK_CHECK || "0 */4 * * *",

    // New: Runs every 30 seconds
    // Format: second(optional) minute hour day month dayOfWeek
    every30Seconds: process.env.CRON_EVERY_30_SECONDS || "*/30 * * * * *",
  };

  // Schedule breakfast inventory consumption
  cron.schedule(schedules.breakfastConsumption, () => {
    console.log(
      `[Cron Job] Scheduled breakfast inventory consumption triggered at ${new Date().toISOString()}`
    );
    consumeInventoryForMeal("breakfast");
  });

  console.log(
    `[Cron Job] Breakfast consumption scheduled: ${schedules.breakfastConsumption}`
  );

  // Schedule lunch inventory consumption
  cron.schedule(schedules.lunchConsumption, () => {
    console.log(
      `[Cron Job] Scheduled lunch inventory consumption triggered at ${new Date().toISOString()}`
    );
    consumeInventoryForMeal("lunch");
  });

  console.log(
    `[Cron Job] Lunch consumption scheduled: ${schedules.lunchConsumption}`
  );

  // Schedule dinner inventory consumption
  cron.schedule(schedules.dinnerConsumption, () => {
    console.log(
      `[Cron Job] Scheduled dinner inventory consumption triggered at ${new Date().toISOString()}`
    );
    consumeInventoryForMeal("dinner");
  });

  console.log(
    `[Cron Job] Dinner consumption scheduled: ${schedules.dinnerConsumption}`
  );

  // Schedule legacy daily inventory consumption (optional - can be disabled)
  if (process.env.ENABLE_LEGACY_DAILY_CONSUMPTION === "true") {
    cron.schedule(schedules.dailyConsumption, () => {
      console.log(
        `[Cron Job] Scheduled legacy daily inventory consumption triggered at ${new Date().toISOString()}`
      );
      // Use new per-meal functions instead of old function
      consumeInventoryForMeal("breakfast");
      consumeInventoryForMeal("lunch");
      consumeInventoryForMeal("dinner");
    });

    console.log(
      `[Cron Job] Legacy daily consumption scheduled: ${schedules.dailyConsumption}`
    );
  }

  // Schedule low stock checking
  cron.schedule(schedules.lowStockCheck, () => {
    console.log(
      `[Cron Job] Scheduled low stock check triggered at ${new Date().toISOString()}`
    );
    checkLowStockItems();
  });

  // // Schedule low stock checking
  // cron.schedule(schedules.every30Seconds, () => {
  //   console.log(
  //     `[Cron Job] Scheduled test run triggered at ${new Date().toISOString()}`
  //   );
  //   checkLowStockItems();
  // });

  console.log(
    `[Cron Job] Low stock check scheduled: ${schedules.lowStockCheck}`
  );

  console.log("[Cron Jobs] All cron jobs initialized successfully.");
};

export {
  initializeCronJobs,
  consumeInventoryFromMealPlans,
  consumeInventoryForMeal,
  checkLowStockItems,
};
