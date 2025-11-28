import asyncHandler from "express-async-handler";
import InventoryUsage from "../models/inventoryUsage.model.js";
import InventoryItem from "../models/inventory.model.js";
import AttendanceSession from "../models/attendanceSession.model.js";

/**
 * Helper function to get attendance count for a specific date and session type
 */
const getAttendanceForDate = async (date, sessionType) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const session = await AttendanceSession.findOne({
    sessionType,
    markedAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  return session ? session.presentCount : null;
};

/**
 * @desc    Record inventory usage for a meal
 * @route   POST /api/inventory-usage
 * @access  Private/Kitchen
 */
const recordInventoryUsage = asyncHandler(async (req, res) => {
  const { date, mealType, items, notes } = req.body;

  // Validate required fields
  if (
    !date ||
    !mealType ||
    !items ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    res.status(400);
    throw new Error("Date, mealType, and items array are required");
  }

  // Validate meal type
  const validMealTypes = ["breakfast", "lunch", "dinner"];
  if (!validMealTypes.includes(mealType)) {
    res.status(400);
    throw new Error(
      "Invalid meal type. Must be 'breakfast', 'lunch', or 'dinner'"
    );
  }

  // Parse date
  const usageDate = new Date(date);
  if (isNaN(usageDate.getTime())) {
    res.status(400);
    throw new Error("Invalid date format");
  }
  usageDate.setHours(0, 0, 0, 0);

  // Determine which attendance session to use
  // Morning meals (breakfast, lunch) use previous day's evening attendance
  // Evening meals (dinner) use current day's evening attendance
  let attendanceDate = new Date(usageDate);
  let attendanceSessionType = "evening";

  if (mealType === "breakfast" || mealType === "lunch") {
    // Use previous day's evening attendance
    attendanceDate.setDate(attendanceDate.getDate() - 1);
  }
  // For dinner, use current day's evening attendance (already set)

  // Get attendance count
  const attendanceCount = await getAttendanceForDate(
    attendanceDate,
    attendanceSessionType
  );

  if (attendanceCount === null) {
    res.status(404);
    throw new Error(
      `Attendance not found for ${attendanceSessionType} session on ${attendanceDate.toLocaleDateString()}. Please record attendance first.`
    );
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

  // Validate and process items
  const processedItems = [];
  const inventoryUpdates = [];
  const errors = [];

  for (const item of items) {
    const { inventoryItemId, recordedQuantity, recordedForStudents } = item;

    // Validate item
    if (
      !inventoryItemId ||
      recordedQuantity === undefined ||
      !recordedForStudents
    ) {
      errors.push(
        "Each item must have inventoryItemId, recordedQuantity, and recordedForStudents"
      );
      continue;
    }

    if (![1, 10].includes(recordedForStudents)) {
      errors.push("recordedForStudents must be either 1 or 10");
      continue;
    }

    // Get inventory item
    const inventoryItem = await InventoryItem.findById(inventoryItemId);
    if (!inventoryItem) {
      errors.push(`Inventory item ${inventoryItemId} not found`);
      continue;
    }

    // Calculate actual quantity to deduct
    // Formula: (attendanceCount / recordedForStudents) * recordedQuantity
    const actualQuantity =
      (attendanceCount / recordedForStudents) * recordedQuantity;

    // Check if sufficient stock
    if (inventoryItem.currentStock < actualQuantity) {
      errors.push(
        `Insufficient stock for ${
          inventoryItem.name
        }. Available: ${inventoryItem.currentStock.toFixed(2)} ${
          inventoryItem.unit
        }, Required: ${actualQuantity.toFixed(2)} ${inventoryItem.unit}`
      );
      continue;
    }

    // Prepare item for usage record
    processedItems.push({
      inventoryItemId,
      recordedQuantity,
      recordedForStudents,
      actualQuantityDeducted: actualQuantity,
    });

    // Prepare inventory update
    inventoryUpdates.push({
      item: inventoryItem,
      quantityToDeduct: actualQuantity,
    });
  }

  if (errors.length > 0) {
    res.status(400);
    throw new Error(errors.join("; "));
  }

  // Deduct inventory
  for (const update of inventoryUpdates) {
    update.item.currentStock -= update.quantityToDeduct;
    update.item.lastUpdated = new Date();
    await update.item.save();
  }

  // Create usage record
  const usageRecord = await InventoryUsage.create({
    date: usageDate,
    mealType,
    items: processedItems,
    attendanceCount,
    attendanceSessionId: attendanceSession?._id || null,
    recordedBy: req.user._id,
    notes: notes || "",
  });

  // Populate for response
  const populatedUsage = await InventoryUsage.findById(usageRecord._id)
    .populate("items.inventoryItemId", "name unit category")
    .populate("recordedBy", "name email")
    .populate("attendanceSessionId", "sessionType presentCount markedAt");

  res.status(201).json({
    success: true,
    message: "Inventory usage recorded and deducted successfully",
    data: populatedUsage,
  });
});

/**
 * @desc    Get inventory usage records
 * @route   GET /api/inventory-usage
 * @access  Private/Kitchen/Admin
 */
const getInventoryUsage = asyncHandler(async (req, res) => {
  const { date, mealType, page = 1, limit = 50 } = req.query;

  let query = {};

  // Filter by date
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    query.date = {
      $gte: startOfDay,
      $lte: endOfDay,
    };
  }

  // Filter by meal type
  if (mealType) {
    query.mealType = mealType;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [usageRecords, total] = await Promise.all([
    InventoryUsage.find(query)
      .populate("items.inventoryItemId", "name unit category")
      .populate("recordedBy", "name email")
      .populate("attendanceSessionId", "sessionType presentCount markedAt")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    InventoryUsage.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: usageRecords,
  });
});

/**
 * @desc    Get inventory usage by ID
 * @route   GET /api/inventory-usage/:id
 * @access  Private/Kitchen/Admin
 */
const getInventoryUsageById = asyncHandler(async (req, res) => {
  const usageRecord = await InventoryUsage.findById(req.params.id)
    .populate("items.inventoryItemId", "name unit category")
    .populate("recordedBy", "name email")
    .populate("attendanceSessionId", "sessionType presentCount markedAt");

  if (!usageRecord) {
    res.status(404);
    throw new Error("Inventory usage record not found");
  }

  res.status(200).json({
    success: true,
    data: usageRecord,
  });
});

/**
 * @desc    Get attendance info for a specific date and meal type
 * @route   GET /api/inventory-usage/attendance-info
 * @access  Private/Kitchen
 */
const getAttendanceInfo = asyncHandler(async (req, res) => {
  const { date, mealType } = req.query;

  if (!date || !mealType) {
    res.status(400);
    throw new Error("Date and mealType are required");
  }

  const validMealTypes = ["breakfast", "lunch", "dinner"];
  if (!validMealTypes.includes(mealType)) {
    res.status(400);
    throw new Error(
      "Invalid meal type. Must be 'breakfast', 'lunch', or 'dinner'"
    );
  }

  // Parse date string (YYYY-MM-DD format) and handle timezone correctly
  // Create date in local timezone to avoid timezone conversion issues
  const dateParts = date.split("-");
  if (dateParts.length !== 3) {
    res.status(400);
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }

  const usageDate = new Date(
    parseInt(dateParts[0]),
    parseInt(dateParts[1]) - 1, // Month is 0-indexed
    parseInt(dateParts[2])
  );
  usageDate.setHours(0, 0, 0, 0);

  // Determine which attendance session to use
  let attendanceDate = new Date(usageDate);
  let attendanceSessionType = "evening";

  if (mealType === "breakfast" || mealType === "lunch") {
    attendanceDate.setDate(attendanceDate.getDate() - 1);
  }

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

  if (!attendanceSession) {
    // Format date for display (YYYY-MM-DD)
    const formattedDate = `${attendanceDate.getFullYear()}-${String(
      attendanceDate.getMonth() + 1
    ).padStart(2, "0")}-${String(attendanceDate.getDate()).padStart(2, "0")}`;

    res.status(200).json({
      success: true,
      data: {
        attendanceCount: null,
        attendanceDate: formattedDate,
        sessionType: attendanceSessionType,
        message: `No ${attendanceSessionType} attendance found for ${attendanceDate.toLocaleDateString()}`,
      },
    });
    return;
  }

  // Get the actual date from the attendance session that was found
  const sessionDate = new Date(attendanceSession.markedAt);
  sessionDate.setHours(0, 0, 0, 0);
  const formattedSessionDate = `${sessionDate.getFullYear()}-${String(
    sessionDate.getMonth() + 1
  ).padStart(2, "0")}-${String(sessionDate.getDate()).padStart(2, "0")}`;

  res.status(200).json({
    success: true,
    data: {
      attendanceCount: attendanceSession.presentCount,
      attendanceDate: formattedSessionDate, // Use actual date from the session
      sessionType: attendanceSessionType,
      sessionId: attendanceSession._id,
    },
  });
});

export {
  recordInventoryUsage,
  getInventoryUsage,
  getInventoryUsageById,
  getAttendanceInfo,
};
