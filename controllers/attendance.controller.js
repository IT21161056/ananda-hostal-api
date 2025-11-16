import asyncHandler from "express-async-handler";
import AttendanceSession from "../models/attendanceSession.model.js";
import AttendanceRecord from "../models/attendanceRecord.model.js";
import Student from "../models/student.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import {
  getUserIdsByRoles,
  sendNotifications,
} from "./notification.controller.js";

/**
 * @desc    Create new attendance session
 * @route   POST /api/attendance
 * @access  Private/Warden
 */
const createAttendanceSession = asyncHandler(async (req, res) => {
  const { sessionType, notes, records, date } = req.body;

  // Validate required fields
  if (!sessionType || !records) {
    res.status(400);
    throw new Error(
      "Please provide all required fields: sessionType and records"
    );
  }

  // Validate session type
  const validSessionTypes = ["morning", "evening"];
  if (!validSessionTypes.includes(sessionType)) {
    res.status(400);
    throw new Error("Invalid session type. Must be 'morning' or 'evening'");
  }

  // Parse and validate date (default to today if not provided)
  let attendanceDate = new Date();
  if (date) {
    attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      res.status(400);
      throw new Error("Invalid date format. Please provide a valid date.");
    }
    // Set to start of day for consistency
    attendanceDate.setHours(0, 0, 0, 0);
  } else {
    attendanceDate.setHours(0, 0, 0, 0);
  }

  // Check if attendance already exists for this date and session type
  const startOfDay = new Date(attendanceDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(attendanceDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingSession = await AttendanceSession.findOne({
    sessionType,
    markedAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  if (existingSession) {
    res.status(409); // Conflict status code
    throw new Error(
      `Attendance for ${sessionType} session on ${attendanceDate.toLocaleDateString()} already exists. Please update or delete the existing record instead.`
    );
  }

  // Validate all student records and create attendance records
  const invalidStudents = [];
  const attendanceRecordIds = [];
  let presentCount = 0;
  let absentCount = 0;

  // Process records in parallel for better performance
  await Promise.all(
    records.map(async (record) => {
      const student = await Student.findById(record.student);
      if (!student) {
        invalidStudents.push(record.student);
        return;
      }

      // Create attendance record
      const newRecord = await AttendanceRecord.create({
        student: record.student,
        status: record.status,
        remarks: record.remarks || "",
      });

      attendanceRecordIds.push(newRecord._id);

      // Update counters
      if (record.status === "present") {
        presentCount++;
      } else {
        absentCount++;
      }
    })
  );

  if (invalidStudents.length > 0) {
    res.status(400);
    throw new Error(
      `Invalid students or students not in this dorm: ${invalidStudents.join(
        ", "
      )}`
    );
  }

  // Create the session with the specified date
  const session = await AttendanceSession.create({
    sessionType,
    attendanceRecords: attendanceRecordIds,
    totalStudents: records.length,
    presentCount,
    absentCount,
    markedBy: req.user._id,
    markedAt: attendanceDate, // Set the attendance date
    notes: notes || "",
    isCompleted: false,
  });

  // Populate data for the response
  const populatedSession = await AttendanceSession.findById(session._id)
    .populate({
      path: "attendanceRecords",
      populate: {
        path: "student",
        select: "firstName lastName studentId",
      },
    })
    .populate("markedBy", "firstName lastName role");

  // NOTIFICATION INTEGRATION STARTS HERE
  try {
    // Get all admins and wardens except the one who marked attendance
    const staffToNotify = await getUserIdsByRoles(
      ["admin", "warden"],
      req.user._id
    );

    // Create notification message
    const sessionTime = sessionType === "morning" ? "Morning" : "Evening";
    const notificationTitle = `${sessionTime} Attendance Marked`;
    const notificationMessage = `${req.user.firstName} ${req.user.lastName} marked attendance for ${records.length} students (${presentCount} present, ${absentCount} absent)`;

    // Create notifications for each staff member
    // Send notifications (pass req to access io)
    await sendNotifications(
      staffToNotify,
      {
        title: notificationTitle,
        message: notificationMessage,
        type: "info",
      },
      req
    );
  } catch (notificationError) {
    console.error("Failed to send notifications:", notificationError);
    // Don't fail the whole request if notifications fail
  }
  // NOTIFICATION INTEGRATION ENDS HERE

  res.status(201).json({
    success: true,
    message: "Attendance session created successfully",
    data: populatedSession,
  });
});

// /**
//  * @desc    Get all attendance sessions with filtering
//  * @route   GET /api/attendance/sessions
//  * @access  Private/Warden
//  */
// const getAttendanceSessions = asyncHandler(async (req, res) => {
//   const {
//     sessionType,
//     dorm,
//     student,
//     isCompleted,
//     fromDate,
//     toDate,
//     page = 1,
//     limit = 10,
//   } = req.query;

//   let query = {};

//   // Date filtering
//   if (fromDate || toDate) {
//     query.createdAt = {};
//     if (fromDate) query.createdAt.$gte = new Date(fromDate);
//     if (toDate) query.createdAt.$lte = new Date(toDate);
//   }

//   // Other filters
//   if (sessionType) query.sessionType = sessionType;
//   if (dorm) query.dorm = dorm;
//   if (isCompleted) query.isCompleted = isCompleted === "true";

//   // Student-specific filtering
//   if (student) {
//     const studentRecords = await AttendanceRecord.find({ student }).select(
//       "_id"
//     );
//     query.attendanceRecords = { $in: studentRecords.map((r) => r._id) };
//   }

//   const skip = (page - 1) * limit;

//   const [sessions, total] = await Promise.all([
//     AttendanceSession.find(query)
//       .populate({
//         path: "attendanceRecords",
//         populate: {
//           path: "student",
//           select: "name admissionNumber class dorm", // Use correct field names from your model
//           model: "Student",
//         },
//       })
//       .populate("markedBy", "name role") // Changed to match your User model
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit),
//     AttendanceSession.countDocuments(query),
//   ]);

//   res.status(200).json({
//     success: true,
//     total,
//     page: parseInt(page),
//     pages: Math.ceil(total / limit),
//     data: sessions,
//   });
// });

/**
 * @desc    Get all attendance sessions with filtering
 * @route   GET /api/attendance/sessions
 * @access  Private/Warden
 */
const getAttendanceSessions = asyncHandler(async (req, res) => {
  const {
    sessionType,
    dorm,
    student,
    isCompleted,
    date, // Changed from fromDate/toDate to just date
    page = 1,
    limit = 10,
  } = req.query;

  let query = {};

  // Single date filtering - use markedAt if available, otherwise createdAt
  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0); // Start of the day

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999); // End of the day

    // Filter by markedAt (attendance date) or createdAt (for backwards compatibility)
    query.$or = [
      {
        markedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      {
        // For sessions without markedAt, use createdAt
        markedAt: { $exists: false },
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    ];
  }

  // Other filters (sessionType is applied to the base query, not $or)
  if (sessionType) {
    query.sessionType = sessionType;
  }
  if (dorm) query.dorm = dorm;
  if (isCompleted) query.isCompleted = isCompleted === "true";

  // Student-specific filtering
  if (student) {
    const studentRecords = await AttendanceRecord.find({ student }).select(
      "_id"
    );
    query.attendanceRecords = { $in: studentRecords.map((r) => r._id) };
  }

  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    AttendanceSession.find(query)
      .populate({
        path: "markedBy",
        select: "firstName lastName role", // Assuming these are the fields in your User model
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(), // Convert to plain JavaScript objects
    AttendanceSession.countDocuments(query),
  ]);

  // Transform the data to match your interface
  const formattedSessions = sessions.map((session) => ({
    id: session._id.toString(),
    date: (session.markedAt || session.createdAt).toISOString().split("T")[0], // Format as YYYY-MM-DD, use markedAt if available
    session: session.sessionType,
    presentCount: session.presentCount,
    absentCount: session.absentCount,
    leaveCount: session.leaveCount || 0, // Default to 0 if not present
    totalStudents: session.totalStudents,
    recordedBy: session.markedBy
      ? `${session.markedBy.firstName} ${session.markedBy.lastName}`
      : "Unknown",
  }));

  res.status(200).json({
    total,
    data: formattedSessions,
  });
});

/**
 * @desc    Get single attendance session by ID
 * @route   GET /api/attendance/:id
 * @access  Private/Warden
 */
const getAttendanceSessionById = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.id)
    .populate("markedByDetails")
    .populate("dormDetails")
    .populate("records.student", "name age studentId dorm");

  if (!session) {
    res.status(404);
    throw new Error("Attendance session not found");
  }

  res.status(200).json({
    success: true,
    data: session,
  });
});

/**
 * @desc    Update attendance session
 * @route   PUT /api/attendance/:id
 * @access  Private/Warden
 */
const updateAttendanceSession = asyncHandler(async (req, res) => {
  const { records } = req.body;
  const sessionId = req.params.id;

  if (!records) {
    res.status(400);
    throw new Error("Please provide records to update");
  }

  const session = await AttendanceSession.findById(sessionId);
  if (!session) {
    res.status(404);
    throw new Error("Attendance session not found");
  }

  // Validate new records
  const invalidStudents = [];
  const validRecords = [];

  for (const record of records) {
    const student = await Student.findById(record.student);
    if (!student) {
      invalidStudents.push(record.student);
      continue;
    }
    if (student.dorm.toString() !== session.dorm.toString()) {
      invalidStudents.push(record.student);
      continue;
    }
    validRecords.push(record);
  }

  if (invalidStudents.length > 0) {
    res.status(400);
    throw new Error(
      `Invalid students or students not in this dorm: ${invalidStudents.join(
        ", "
      )}`
    );
  }

  // Update records
  session.records = validRecords;
  const updatedSession = await session.save();

  // Populate for response
  const populatedSession = await AttendanceSession.findById(updatedSession._id)
    .populate("markedByDetails")
    .populate("dormDetails")
    .populate("records.student", "name age studentId");

  res.status(200).json({
    success: true,
    message: "Attendance session updated successfully",
    data: populatedSession,
  });
});

/**
 * @desc    Delete attendance session
 * @route   DELETE /api/attendance/:id
 * @access  Private/Warden/Admin
 */
const deleteAttendanceSession = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findByIdAndDelete(req.params.id);

  if (!session) {
    res.status(404);
    throw new Error("Attendance session not found");
  }

  res.status(200).json({
    success: true,
    message: "Attendance session deleted successfully",
    data: { id: session._id },
  });
});

/**
 * @desc    Check if attendance exists for a specific date and session type
 * @route   GET /api/attendance/check
 * @access  Private/Warden
 */
const checkAttendanceExists = asyncHandler(async (req, res) => {
  const { date, sessionType } = req.query;

  if (!date || !sessionType) {
    res.status(400);
    throw new Error("Please provide date and sessionType parameters");
  }

  // Parse date
  const attendanceDate = new Date(date);
  if (isNaN(attendanceDate.getTime())) {
    res.status(400);
    throw new Error("Invalid date format");
  }

  attendanceDate.setHours(0, 0, 0, 0);
  const startOfDay = new Date(attendanceDate);
  const endOfDay = new Date(attendanceDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Check if attendance exists - check both markedAt and createdAt for backwards compatibility
  const existingSession = await AttendanceSession.findOne({
    sessionType,
    $or: [
      {
        markedAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
      {
        // For sessions without markedAt, check createdAt
        markedAt: { $exists: false },
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
    ],
  }).select("_id markedAt sessionType");

  res.status(200).json({
    exists: !!existingSession,
    session: existingSession || null,
  });
});

/**
 * @desc    Get student attendance history
 * @route   GET /api/attendance/student/:studentId
 * @access  Private/Warden
 */
const getStudentAttendanceHistory = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { fromDate, toDate, page = 1, limit = 10 } = req.query;

  // Validate student exists
  const student = await Student.findById(studentId);
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  let query = { "records.student": studentId };

  // Date range filtering
  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) query.date.$gte = new Date(fromDate);
    if (toDate) query.date.$lte = new Date(toDate);
  }

  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    AttendanceSession.find(query)
      .populate("dormDetails")
      .sort({ date: -1, sessionType: 1 })
      .skip(skip)
      .limit(limit),
    AttendanceSession.countDocuments(query),
  ]);

  // Extract just this student's records from each session
  const attendanceHistory = sessions.map((session) => {
    const studentRecord = session.records.find(
      (record) => record.student.toString() === studentId
    );
    return {
      _id: session._id,
      date: session.date,
      sessionType: session.sessionType,
      dorm: session.dormDetails,
      status: studentRecord.status,
      remarks: studentRecord.remarks,
      markedAt: session.createdAt,
    };
  });

  res.status(200).json({
    success: true,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: attendanceHistory,
  });
});

export {
  createAttendanceSession,
  getAttendanceSessions,
  getAttendanceSessionById,
  updateAttendanceSession,
  deleteAttendanceSession,
  getStudentAttendanceHistory,
  checkAttendanceExists,
};
