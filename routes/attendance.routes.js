import express from "express";
import {
  createAttendanceSession,
  getAttendanceSessions,
  getAttendanceSessionById,
  updateAttendanceSession,
  deleteAttendanceSession,
  getStudentAttendanceHistory,
} from "../controllers/attendance.controller.js";
import { protect, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, authorizeRoles("admin", "warden"), createAttendanceSession)
  .get(protect, authorizeRoles("admin", "warden"), getAttendanceSessions);

router
  .route("/:id")
  .get(protect, authorizeRoles("admin", "warden"), getAttendanceSessionById)
  .put(protect, authorizeRoles("admin", "warden"), updateAttendanceSession)
  .delete(protect, authorizeRoles("admin", "warden"), deleteAttendanceSession);

router
  .route("/student/:studentId")
  .get(
    protect,
    authorizeRoles(["admin", "warden"]),
    getStudentAttendanceHistory
  );

export default router;
