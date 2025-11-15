import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["vegetables", "grains", "dairy", "spices", "other"],
      lowercase: true,
    },
    currentStock: {
      type: Number,
      required: [true, "Current stock is required"],
      min: [0, "Current stock cannot be negative"],
      default: 0,
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      default: "kg",
    },
    minimumStock: {
      type: Number,
      required: [true, "Minimum stock is required"],
      min: [0, "Minimum stock cannot be negative"],
      default: 0,
    },
    costPerUnit: {
      type: Number,
      required: [true, "Cost per unit is required"],
      min: [0, "Cost per unit cannot be negative"],
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster searches
inventoryItemSchema.index({ name: 1, category: 1 });

export default mongoose.model("InventoryItem", inventoryItemSchema);
