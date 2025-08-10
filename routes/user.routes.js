import express from "express";
const router = express.Router();
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  deleteUser,
} from "../controllers/user.controller.js";
import { protect, authorizeRoles } from "../middleware/authmiddleware.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - nic
 *         - phone
 *         - password
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated MongoDB ID
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         nic:
 *           type: string
 *           description: User's National Identity Card number
 *         phone:
 *           type: string
 *           description: User's phone number
 *         password:
 *           type: string
 *           format: password
 *           description: Hashed password
 *         role:
 *           type: string
 *           enum: [student, user, lecturer, admin]
 *           default: student
 *           description: User's role
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date user was last updated
 *     UserInput:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - nic
 *         - phone
 *         - password
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         nic:
 *           type: string
 *         phone:
 *           type: string
 *         password:
 *           type: string
 *           format: password
 *         role:
 *           type: string
 *           enum: [student, user, lecturer, admin]
 *           default: student
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// Protected routes - profile management
/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user's profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - No valid token provided
 *       500:
 *         description: Server error
 */
router.route("/profile").get(protect, getCurrentUserProfile);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - No valid token provided
 *       500:
 *         description: Server error
 */
router.route("/profile").put(protect, updateCurrentUserProfile);

// Admin only routes
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - No valid token or not admin
 *       403:
 *         description: Forbidden - Not authorized as admin
 *       500:
 *         description: Server error
 */
router.route("/").post(createUser);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users with filtering and search (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for firstName, lastName, or email (case-insensitive partial match)
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email (case-insensitive partial match)
 *       - in: query
 *         name: firstName
 *         schema:
 *           type: string
 *         description: Filter by first name (case-insensitive partial match)
 *       - in: query
 *         name: lastName
 *         schema:
 *           type: string
 *         description: Filter by last name (case-insensitive partial match)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, user, lecturer, admin]
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: List of filtered users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                   description: Number of users returned
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - No valid token or not admin
 *       403:
 *         description: Forbidden - Not authorized as admin
 *       500:
 *         description: Server error
 */
router.route("/").get(protect, authorizeRoles("admin"), getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB ID of the user to get
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - No valid token or not admin
 *       403:
 *         description: Forbidden - Not authorized as admin
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.route("/:id").get(protect, authorizeRoles("admin"), getUserById);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - No valid token or not admin
 *       403:
 *         description: Forbidden - Not authorized as admin
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.route("/:id").put(protect, authorizeRoles("admin"), updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized - No valid token or not admin
 *       403:
 *         description: Forbidden - Not authorized as admin
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.route("/:id").delete(protect, authorizeRoles("admin"), deleteUser);

export default router;
