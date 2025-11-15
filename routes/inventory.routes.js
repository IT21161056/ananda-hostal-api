import express from "express";
const router = express.Router();
import {
  createInventoryItem,
  getAllInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
} from "../controllers/inventory.controller.js";
import { protect, authorizeRoles } from "../middleware/authmiddleware.js";

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: API endpoints for managing kitchen inventory
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryItem:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - currentStock
 *         - unit
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the inventory item
 *         name:
 *           type: string
 *           description: Name of the inventory item
 *           example: Rice
 *         category:
 *           type: string
 *           enum: [vegetables, grains, dairy, spices, other]
 *           description: Category of the inventory item
 *           example: grains
 *         currentStock:
 *           type: number
 *           description: Current stock quantity
 *           example: 500
 *         unit:
 *           type: string
 *           description: Unit of measurement
 *           example: kg
 *         minimumStock:
 *           type: number
 *           description: Minimum stock level
 *           example: 100
 *         costPerUnit:
 *           type: number
 *           description: Cost per unit
 *           example: 45
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: string
 *           description: ID of the user who created the item
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/inventory:
 *   post:
 *     summary: Create a new inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryItem'
 *     responses:
 *       201:
 *         description: Inventory item created successfully
 *       400:
 *         description: Validation error or item already exists
 *       401:
 *         description: Unauthorized access
 *
 *   get:
 *     summary: Get all inventory items with search, filter, and pagination
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: search
 *         in: query
 *         description: Search items by name
 *         required: false
 *         schema:
 *           type: string
 *       - name: category
 *         in: query
 *         description: Filter by category
 *         required: false
 *         schema:
 *           type: string
 *           enum: [vegetables, grains, dairy, spices, other]
 *       - name: status
 *         in: query
 *         description: Filter by stock status (low, medium, good)
 *         required: false
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: limit
 *         in: query
 *         description: Number of results per page
 *         schema:
 *           type: integer
 *           example: 100
 *     responses:
 *       200:
 *         description: Successfully fetched inventory items
 *       401:
 *         description: Unauthorized access
 */

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: Get an inventory item by ID
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the inventory item
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully fetched inventory item
 *       404:
 *         description: Inventory item not found
 *       401:
 *         description: Unauthorized access
 *
 *   put:
 *     summary: Update an inventory item by ID
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the inventory item
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryItem'
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *       400:
 *         description: Validation error or duplicate name
 *       404:
 *         description: Inventory item not found
 *       401:
 *         description: Unauthorized access
 *
 *   delete:
 *     summary: Delete an inventory item by ID
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the inventory item
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory item deleted successfully
 *       404:
 *         description: Inventory item not found
 *       401:
 *         description: Unauthorized access
 */

router
  .route("/")
  .post(protect, authorizeRoles("admin", "kitchen"), createInventoryItem)
  .get(protect, authorizeRoles("admin", "kitchen"), getAllInventoryItems);

router
  .route("/:id")
  .get(protect, authorizeRoles("admin", "kitchen"), getInventoryItemById)
  .put(protect, authorizeRoles("admin", "kitchen"), updateInventoryItem)
  .delete(protect, authorizeRoles("admin"), deleteInventoryItem);

export default router;
