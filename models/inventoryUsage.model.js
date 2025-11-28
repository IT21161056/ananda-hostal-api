import mongoose from "mongoose";

const inventoryUsageSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    mealType: {
      type: String,
      required: true,
      enum: ["breakfast", "lunch", "dinner"],
      index: true,
    },
    // Items used with quantities recorded for a specific number of students
    items: [
      {
        inventoryItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InventoryItem",
          required: true,
        },
        recordedQuantity: {
          type: Number,
          required: true,
          min: [0, "Quantity cannot be negative"],
        },
        // Number of students this quantity was recorded for (1 or 10)
        recordedForStudents: {
          type: Number,
          required: true,
          enum: [1, 10],
        },
        // Actual quantity deducted after calculation based on attendance
        actualQuantityDeducted: {
          type: Number,
          default: 0,
          min: [0, "Quantity cannot be negative"],
        },
      },
    ],
    // Attendance used for calculation
    attendanceCount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Which attendance session was used (for reference)
    attendanceSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSession",
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// Index for faster queries
inventoryUsageSchema.index({ date: 1, mealType: 1 });

export default mongoose.model("InventoryUsage", inventoryUsageSchema);
