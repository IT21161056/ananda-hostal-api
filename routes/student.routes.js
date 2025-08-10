import express from "express";
const router = express.Router();
import {
  createStudent,
  updateStudent,
  getAllStudents,
  getStudentByAdmissionNumber,
  toggleStudentStatus,
  deleteStudent,
  getStudentsForAttendance, // Import the new controller
} from "../controllers/student.controller.js";
import { protect, authorizeRoles } from "../middleware/authmiddleware.js";

// Admin routes
router.route("/").post(createStudent).get(getAllStudents);

router
  .route("/:admissionNumber")
  .get(getStudentByAdmissionNumber)
  .put(updateStudent)
  .delete(deleteStudent);

router.route("/:admissionNumber/status").patch(toggleStudentStatus);

// New route for attendance marking
router.route("/attendance/marking").get(
  protect,
  authorizeRoles("warden", "admin"), // Assuming teachers and admins can mark attendance
  getStudentsForAttendance
);

export default router;
