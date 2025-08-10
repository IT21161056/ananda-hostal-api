// models/AttendanceSession.js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

// Main attendance session schema
const attendanceSessionSchema = new Schema(
  {
    sessionType: {
      type: String,
      required: true,
      enum: ["morning", "evening"],
      index: true,
    },
    attendanceRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AttendanceRecord",
      },
    ],
    totalStudents: {
      type: Number,
      required: true,
      min: 0,
    },
    presentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    absentCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Fixed reference to User model
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      maxlength: 500,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model("AttendanceSession", attendanceSessionSchema);
