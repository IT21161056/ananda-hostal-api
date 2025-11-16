import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { protect } from "../middleware/authmiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalStudents:
 *                       type: number
 *                     presentToday:
 *                       type: number
 *                     pendingPayments:
 *                       type: number
 *                     overduePayments:
 *                       type: number
 *                     monthlyRevenue:
 *                       type: number
 *                     hostelOccupancy:
 *                       type: object
 *                     attendanceRate:
 *                       type: number
 *                     studentsThisMonth:
 *                       type: number
 *                     avgOccupancy:
 *                       type: number
 *                     totalOccupiedBeds:
 *                       type: number
 *                     totalAvailableBeds:
 *                       type: number
 *                     highOccupancyCount:
 *                       type: number
 *                     weeklyAttendance:
 *                       type: array
 *                     avgMorning:
 *                       type: number
 *                     avgEvening:
 *                       type: number
 *                     bestDay:
 *                       type: string
 *       401:
 *         description: Unauthorized access
 */
router.route("/stats").get(protect, getDashboardStats);

export default router;
