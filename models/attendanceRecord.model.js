// models/AttendanceSession.js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

// Individual attendance record schema
const attendanceRecordSchema = new Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["present", "absent"],
      default: "absent",
    },
    remarks: {
      type: String,
      maxlength: 200,
      trim: true,
    },
  },
  { timestamps: true }
);

export default model("AttendanceRecord", attendanceRecordSchema);
