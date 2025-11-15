import asyncHandler from "express-async-handler";
import MealPlan from "../models/mealplan.model.js";

/**
 * @desc    Create a new meal plan
 * @route   POST /api/meal-plans
 * @access  Private/Admin
 */
const createMealPlan = asyncHandler(async (req, res) => {
  const {
    day,
    estimatedCost,
    breakfast,
    lunch,
    dinner,
    breakfastInventory,
    lunchInventory,
    dinnerInventory,
  } = req.body;

  if (!day || !estimatedCost) {
    res.status(400);
    throw new Error("Day and estimated cost are required");
  }

  // Check if plan already exists for the same day
  const existingPlan = await MealPlan.findOne({ day });
  if (existingPlan) {
    res.status(400);
    throw new Error(`Meal plan for ${day} already exists`);
  }

  const mealPlan = await MealPlan.create({
    day,
    estimatedCost,
    breakfast: breakfast || [],
    lunch: lunch || [],
    dinner: dinner || [],
    breakfastInventory: breakfastInventory || [],
    lunchInventory: lunchInventory || [],
    dinnerInventory: dinnerInventory || [],
    createdBy: req.user?._id || null,
  });

  // Populate inventory items for response
  await mealPlan.populate([
    "breakfastInventory.inventoryItemId",
    "lunchInventory.inventoryItemId",
    "dinnerInventory.inventoryItemId",
  ]);

  res.status(201).json({
    success: true,
    message: `Meal plan for ${day} created successfully`,
    data: mealPlan,
  });
});

/**
 * @desc    Get all meal plans (with pagination & filtering)
 * @route   GET /api/meal-plans
 * @access  Private/Admin
 */
const getAllMealPlans = asyncHandler(async (req, res) => {
  const { search, day } = req.query;
  let query = {};

  // Filter by day if provided
  if (day) {
    query.day = { $regex: new RegExp(day, "i") };
  }

  // Search meals across breakfast, lunch, and dinner
  if (search) {
    query.$or = [
      { breakfast: { $elemMatch: { $regex: new RegExp(search, "i") } } },
      { lunch: { $elemMatch: { $regex: new RegExp(search, "i") } } },
      { dinner: { $elemMatch: { $regex: new RegExp(search, "i") } } },
    ];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [mealPlans, total] = await Promise.all([
    MealPlan.find(query)
      .populate([
        "breakfastInventory.inventoryItemId",
        "lunchInventory.inventoryItemId",
        "dinnerInventory.inventoryItemId",
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    MealPlan.countDocuments(query),
  ]);

  res.status(200).json({
    total,
    data: mealPlans,
  });
});

/**
 * @desc    Get meal plan by ID
 * @route   GET /api/meal-plans/:id
 * @access  Private/Admin
 */
const getMealPlanById = asyncHandler(async (req, res) => {
  const mealPlan = await MealPlan.findById(req.params.id).populate([
    "breakfastInventory.inventoryItemId",
    "lunchInventory.inventoryItemId",
    "dinnerInventory.inventoryItemId",
  ]);

  if (!mealPlan) {
    res.status(404);
    throw new Error("Meal plan not found");
  }

  res.status(200).json({
    success: true,
    data: mealPlan,
  });
});

/**
 * @desc    Update meal plan
 * @route   PUT /api/meal-plans/:id
 * @access  Private/Admin
 */
const updateMealPlan = asyncHandler(async (req, res) => {
  const {
    day,
    estimatedCost,
    breakfast,
    lunch,
    dinner,
    breakfastInventory,
    lunchInventory,
    dinnerInventory,
  } = req.body;

  const mealPlan = await MealPlan.findById(req.params.id);
  if (!mealPlan) {
    res.status(404);
    throw new Error("Meal plan not found");
  }

  // Check if day already exists for another plan
  if (day && day !== mealPlan.day) {
    const existingPlan = await MealPlan.findOne({ day });
    if (existingPlan) {
      res.status(400);
      throw new Error(`Meal plan for ${day} already exists`);
    }
    mealPlan.day = day;
  }

  if (estimatedCost !== undefined) mealPlan.estimatedCost = estimatedCost;
  if (breakfast !== undefined) mealPlan.breakfast = breakfast;
  if (lunch !== undefined) mealPlan.lunch = lunch;
  if (dinner !== undefined) mealPlan.dinner = dinner;
  if (breakfastInventory !== undefined)
    mealPlan.breakfastInventory = breakfastInventory;
  if (lunchInventory !== undefined) mealPlan.lunchInventory = lunchInventory;
  if (dinnerInventory !== undefined) mealPlan.dinnerInventory = dinnerInventory;

  const updatedMealPlan = await mealPlan.save();

  // Populate inventory items for response
  await updatedMealPlan.populate([
    "breakfastInventory.inventoryItemId",
    "lunchInventory.inventoryItemId",
    "dinnerInventory.inventoryItemId",
  ]);

  res.status(200).json({
    success: true,
    message: `Meal plan for ${updatedMealPlan.day} updated successfully`,
    data: updatedMealPlan,
  });
});

/**
 * @desc    Delete meal plan
 * @route   DELETE /api/meal-plans/:id
 * @access  Private/Admin
 */
const deleteMealPlan = asyncHandler(async (req, res) => {
  const mealPlan = await MealPlan.findById(req.params.id);

  if (!mealPlan) {
    res.status(404);
    throw new Error("Meal plan not found");
  }

  await MealPlan.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: `Meal plan for ${mealPlan.day} deleted successfully`,
  });
});

export {
  createMealPlan,
  getAllMealPlans,
  getMealPlanById,
  updateMealPlan,
  deleteMealPlan,
};
