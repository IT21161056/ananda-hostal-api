import asyncHandler from "express-async-handler";
import InventoryItem from "../models/inventory.model.js";

/**
 * @desc    Create a new inventory item
 * @route   POST /api/inventory
 * @access  Private/Admin/Kitchen
 */
const createInventoryItem = asyncHandler(async (req, res) => {
  const { name, category, currentStock, unit, minimumStock, costPerUnit } =
    req.body;

  if (!name || !category || currentStock === undefined || !unit) {
    res.status(400);
    throw new Error("Name, category, current stock, and unit are required");
  }

  // Check if item with same name already exists
  const existingItem = await InventoryItem.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });

  if (existingItem) {
    res.status(400);
    throw new Error(`Inventory item "${name}" already exists`);
  }

  const inventoryItem = await InventoryItem.create({
    name,
    category,
    currentStock: Number(currentStock),
    unit,
    minimumStock: Number(minimumStock) || 0,
    costPerUnit: Number(costPerUnit) || 0,
    lastUpdated: new Date(),
    createdBy: req.user?._id || null,
  });

  res.status(201).json({
    success: true,
    message: "Inventory item created successfully",
    data: inventoryItem,
  });
});

/**
 * @desc    Get all inventory items (with pagination & filtering)
 * @route   GET /api/inventory
 * @access  Private/Admin/Kitchen
 */
const getAllInventoryItems = asyncHandler(async (req, res) => {
  const { search, category, status, page, limit } = req.query;
  let query = {};

  // Filter by category if provided
  if (category) {
    query.category = category.toLowerCase();
  }

  // Search by name
  if (search) {
    query.name = { $regex: new RegExp(search, "i") };
  }

  // Filter by stock status
  if (status) {
    const items = await InventoryItem.find(query);
    if (status === "low") {
      const lowStockIds = items
        .filter((item) => item.currentStock <= item.minimumStock)
        .map((item) => item._id);
      query._id = { $in: lowStockIds };
    } else if (status === "medium") {
      const mediumStockIds = items
        .filter(
          (item) =>
            item.currentStock > item.minimumStock &&
            item.currentStock <= item.minimumStock * 1.5
        )
        .map((item) => item._id);
      query._id = { $in: mediumStockIds };
    } else if (status === "good") {
      const goodStockIds = items
        .filter((item) => item.currentStock > item.minimumStock * 1.5)
        .map((item) => item._id);
      query._id = { $in: goodStockIds };
    }
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 100; // Default to 100 for inventory
  const skip = (pageNum - 1) * limitNum;

  const [inventoryItems, total] = await Promise.all([
    InventoryItem.find(query).sort({ name: 1 }).skip(skip).limit(limitNum),
    InventoryItem.countDocuments(query),
  ]);

  res.status(200).json({
    total,
    data: inventoryItems,
  });
});

/**
 * @desc    Get inventory item by ID
 * @route   GET /api/inventory/:id
 * @access  Private/Admin/Kitchen
 */
const getInventoryItemById = asyncHandler(async (req, res) => {
  const inventoryItem = await InventoryItem.findById(req.params.id);

  if (!inventoryItem) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  res.status(200).json({
    success: true,
    data: inventoryItem,
  });
});

/**
 * @desc    Update inventory item
 * @route   PUT /api/inventory/:id
 * @access  Private/Admin/Kitchen
 */
const updateInventoryItem = asyncHandler(async (req, res) => {
  const { name, category, currentStock, unit, minimumStock, costPerUnit } =
    req.body;

  const inventoryItem = await InventoryItem.findById(req.params.id);
  if (!inventoryItem) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  // Check if name is being changed and if it conflicts with existing item
  if (name && name !== inventoryItem.name) {
    const existingItem = await InventoryItem.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: req.params.id },
    });

    if (existingItem) {
      res.status(400);
      throw new Error(`Inventory item "${name}" already exists`);
    }
    inventoryItem.name = name;
  }

  if (category) inventoryItem.category = category.toLowerCase();
  if (currentStock !== undefined)
    inventoryItem.currentStock = Number(currentStock);
  if (unit) inventoryItem.unit = unit;
  if (minimumStock !== undefined)
    inventoryItem.minimumStock = Number(minimumStock);
  if (costPerUnit !== undefined)
    inventoryItem.costPerUnit = Number(costPerUnit);

  inventoryItem.lastUpdated = new Date();

  const updatedItem = await inventoryItem.save();

  res.status(200).json({
    success: true,
    message: "Inventory item updated successfully",
    data: updatedItem,
  });
});

/**
 * @desc    Delete inventory item
 * @route   DELETE /api/inventory/:id
 * @access  Private/Admin
 */
const deleteInventoryItem = asyncHandler(async (req, res) => {
  const inventoryItem = await InventoryItem.findById(req.params.id);

  if (!inventoryItem) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  await InventoryItem.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Inventory item deleted successfully",
  });
});

export {
  createInventoryItem,
  getAllInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
};
