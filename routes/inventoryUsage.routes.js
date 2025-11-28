import express from "express";
import {
  recordInventoryUsage,
  getInventoryUsage,
  getInventoryUsageById,
  getAttendanceInfo,
} from "../controllers/inventoryUsage.controller.js";
import { protect, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/inventory-usage/attendance-info
 * @access  Private/Kitchen
 */
router.get(
  "/attendance-info",
  protect,
  authorizeRoles("admin", "kitchen"),
  getAttendanceInfo
);

/**
 * @route   POST /api/inventory-usage
 * @access  Private/Kitchen
 */
router.post(
  "/",
  protect,
  authorizeRoles("admin", "kitchen"),
  recordInventoryUsage
);

/**
 * @route   GET /api/inventory-usage
 * @access  Private/Kitchen/Admin
 */
router.get("/", protect, authorizeRoles("admin", "kitchen"), getInventoryUsage);

/**
 * @route   GET /api/inventory-usage/:id
 * @access  Private/Kitchen/Admin
 */
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "kitchen"),
  getInventoryUsageById
);

export default router;
