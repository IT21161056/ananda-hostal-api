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
      type: [String], // list of breakfast items (food names/descriptions)
      default: [],
    },

    lunch: {
      type: [String], // list of lunch items (food names/descriptions)
      default: [],
    },

    dinner: {
      type: [String], // list of dinner items (food names/descriptions)
      default: [],
    },

    // Inventory items used for each meal with quantities
    breakfastInventory: {
      type: [
        {
          inventoryItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InventoryItem",
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: [0, "Quantity cannot be negative"],
          },
        },
      ],
      default: [],
    },

    lunchInventory: {
      type: [
        {
          inventoryItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InventoryItem",
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: [0, "Quantity cannot be negative"],
          },
        },
      ],
      default: [],
    },

    dinnerInventory: {
      type: [
        {
          inventoryItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InventoryItem",
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: [0, "Quantity cannot be negative"],
          },
        },
      ],
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
