import asyncHandler from "express-async-handler";
import Student from "../models/student.model.js";
import AttendanceSession from "../models/attendanceSession.model.js";
import AttendanceRecord from "../models/attendanceRecord.model.js";

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  // Calculate date range for last 7 days (for attendance chart)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get total students count
  const totalStudents = await Student.countDocuments({ isActive: true });

  // Get students added this month
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const studentsThisMonth = await Student.countDocuments({
    createdAt: { $gte: firstDayOfMonth },
    isActive: true,
  });

  // Get today's attendance sessions - use markedAt (attendance date) or createdAt (for backwards compatibility)
  const todaySessions = await AttendanceSession.find({
    $or: [
      {
        markedAt: { $gte: today, $lte: endOfToday },
      },
      {
        // For sessions without markedAt, use createdAt (backwards compatibility)
        markedAt: { $exists: false },
        createdAt: { $gte: today, $lte: endOfToday },
      },
    ],
  })
    .populate({
      path: "attendanceRecords",
      populate: {
        path: "student",
        select: "_id",
      },
    })
    .lean();

  // Calculate present today (count unique students marked present in any session today)
  const presentStudentIds = new Set();
  todaySessions.forEach((session) => {
    if (session.attendanceRecords && Array.isArray(session.attendanceRecords)) {
      session.attendanceRecords.forEach((record) => {
        if (record && record.status === "present" && record.student) {
          presentStudentIds.add(record.student._id.toString());
        }
      });
    }
  });
  const presentToday = presentStudentIds.size;

  // Get dorm occupancy data
  const studentsByDorm = await Student.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$dorm", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // Calculate dorm occupancy percentages (assuming capacity of 50 per dorm)
  const DORM_CAPACITY = 50;
  const hostelOccupancy = {};
  let totalOccupiedBeds = 0;
  let totalAvailableBeds = 0;

  studentsByDorm.forEach((dorm) => {
    const occupancyPercentage = Math.round((dorm.count / DORM_CAPACITY) * 100);
    hostelOccupancy[dorm._id] = occupancyPercentage;
    totalOccupiedBeds += dorm.count;
    totalAvailableBeds += DORM_CAPACITY - dorm.count;
  });

  // Calculate average occupancy
  const dormCount = studentsByDorm.length;
  const avgOccupancy =
    dormCount > 0
      ? Math.round(
          studentsByDorm.reduce(
            (sum, dorm) => sum + Math.round((dorm.count / DORM_CAPACITY) * 100),
            0
          ) / dormCount
        )
      : 0;

  // Count high occupancy dorms (>=90%)
  const highOccupancyCount = studentsByDorm.filter(
    (dorm) => Math.round((dorm.count / DORM_CAPACITY) * 100) >= 90
  ).length;

  // Get last 7 days attendance data for chart
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Query using markedAt (attendance date) or createdAt (for backwards compatibility)
    const daySessions = await AttendanceSession.find({
      $or: [
        {
          markedAt: { $gte: startOfDay, $lte: endOfDay },
        },
        {
          // For sessions without markedAt, use createdAt (backwards compatibility)
          markedAt: { $exists: false },
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      ],
    }).lean();

    let morningCount = 0;
    let eveningCount = 0;

    daySessions.forEach((session) => {
      if (session.sessionType === "morning") {
        // Take the maximum if there are multiple morning sessions
        morningCount = Math.max(morningCount, session.presentCount || 0);
      } else if (session.sessionType === "evening") {
        // Take the maximum if there are multiple evening sessions
        eveningCount = Math.max(eveningCount, session.presentCount || 0);
      }
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    last7Days.push({
      day: dayNames[date.getDay()],
      morning: morningCount,
      evening: eveningCount,
    });
  }

  // Calculate attendance statistics
  const avgMorning =
    last7Days.length > 0
      ? Math.round(
          last7Days.reduce((sum, day) => sum + day.morning, 0) /
            last7Days.length
        )
      : 0;
  const avgEvening =
    last7Days.length > 0
      ? Math.round(
          last7Days.reduce((sum, day) => sum + day.evening, 0) /
            last7Days.length
        )
      : 0;

  // Find best day (highest average of morning and evening)
  const bestDay =
    last7Days.length > 0 &&
    last7Days.some((day) => day.morning > 0 || day.evening > 0)
      ? last7Days.reduce((best, current) => {
          const currentAvg = (current.morning + current.evening) / 2;
          const bestAvg = (best.morning + best.evening) / 2;
          return currentAvg > bestAvg ? current : best;
        }).day
      : "N/A";

  // Calculate overall attendance rate
  const attendanceRate =
    totalStudents > 0
      ? Math.round((avgMorning / totalStudents) * 100 * 10) / 10
      : 0;

  // For now, payment data is not available (no payment system)
  // These can be updated when payment system is implemented
  const pendingPayments = 0;
  const overduePayments = 0;
  const monthlyRevenue = 0;

  res.status(200).json({
    success: true,
    data: {
      totalStudents,
      presentToday,
      pendingPayments,
      overduePayments,
      monthlyRevenue,
      hostelOccupancy,
      attendanceRate,
      studentsThisMonth,
      avgOccupancy,
      totalOccupiedBeds,
      totalAvailableBeds,
      highOccupancyCount,
      weeklyAttendance: last7Days,
      avgMorning,
      avgEvening,
      bestDay,
    },
  });
});

export { getDashboardStats };
