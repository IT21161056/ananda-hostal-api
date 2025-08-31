import express from "express";
const router = express.Router();
import {
  createMealPlan,
  getAllMealPlans,
  getMealPlanById,
  updateMealPlan,
  deleteMealPlan,
} from "../controllers/mealplan.controller.js";
import { protect, authorizeRoles } from "../middleware/authmiddleware.js";

/**
 * @swagger
 * tags:
 *   name: MealPlans
 *   description: API endpoints for managing meal plans
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MealPlan:
 *       type: object
 *       required:
 *         - day
 *         - estimatedCost
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the meal plan
 *         day:
 *           type: string
 *           description: The date of the meal plan (YYYY-MM-DD)
 *           example: 2025-09-01
 *         estimatedCost:
 *           type: number
 *           description: Estimated cost of the meals for the day
 *           example: 1500
 *         breakfast:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Eggs", "Bread"]
 *         lunch:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Rice", "Chicken Curry"]
 *         dinner:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Pasta", "Salad"]
 *         createdBy:
 *           type: string
 *           description: ID of the user who created the meal plan
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/meal-plans:
 *   post:
 *     summary: Create a new meal plan
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MealPlan'
 *     responses:
 *       201:
 *         description: Meal plan created successfully
 *       400:
 *         description: Validation error or meal plan already exists
 *       401:
 *         description: Unauthorized access
 *
 *   get:
 *     summary: Get all meal plans with search, filter, and pagination
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: search
 *         in: query
 *         description: Search meals across breakfast, lunch, and dinner
 *         required: false
 *         schema:
 *           type: string
 *       - name: day
 *         in: query
 *         description: Filter meal plans by specific day
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
 *           example: 10
 *     responses:
 *       200:
 *         description: Successfully fetched meal plans
 *       401:
 *         description: Unauthorized access
 */

/**
 * @swagger
 * /api/meal-plans/{id}:
 *   get:
 *     summary: Get a meal plan by ID
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the meal plan
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully fetched meal plan
 *       404:
 *         description: Meal plan not found
 *       401:
 *         description: Unauthorized access
 *
 *   put:
 *     summary: Update a meal plan by ID
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the meal plan
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MealPlan'
 *     responses:
 *       200:
 *         description: Meal plan updated successfully
 *       400:
 *         description: Validation error or duplicate day
 *       404:
 *         description: Meal plan not found
 *       401:
 *         description: Unauthorized access
 *
 *   delete:
 *     summary: Delete a meal plan by ID
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the meal plan
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meal plan deleted successfully
 *       404:
 *         description: Meal plan not found
 *       401:
 *         description: Unauthorized access
 */

router
  .route("/")
  .post(protect, authorizeRoles("admin", "kitchen"), createMealPlan)
  .get(protect, authorizeRoles("admin", "kitchen"), getAllMealPlans);

router
  .route("/:id")
  .get(protect, authorizeRoles("admin", "kitchen"), getMealPlanById)
  .put(protect, authorizeRoles("admin", "kitchen"), updateMealPlan)
  .delete(protect, authorizeRoles("admin"), deleteMealPlan);

export default router;
