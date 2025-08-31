import mongoose from "mongoose";

const mealPlanSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ], // restricts to valid days
    },

    estimatedCost: {
      type: Number,
      required: true,
      default: 0,
    },

    breakfast: {
      type: [String], // list of breakfast items
      default: [],
    },

    lunch: {
      type: [String], // list of lunch items
      default: [],
    },

    dinner: {
      type: [String], // list of dinner items
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // if you want to track which admin/user created it
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("MealPlan", mealPlanSchema);
