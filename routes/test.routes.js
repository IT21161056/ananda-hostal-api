// routes/test.routes.js
import express from "express";
import { protect, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// Test notification endpoint
router.post("/notification", protect, async (req, res) => {
  console.log("req.io exists:", !!req.io);
  console.log("User ID:", req.user._id.toString());
  
  try {
    const { title, message, type = "info" } = req.body;
    
    // Check if user's room exists (for debugging)
    const room = req.io.sockets.adapter.rooms.get(req.user._id.toString());
    console.log("Users in room:", room ? room.size : 0);
    
    if (req.io) {
      req.io.to(req.user._id.toString()).emit("notification", {
        title: title || "Test Notification",
        message: message || "This is a test notification",
        type: type,
        createdAt: new Date(),
      });
      console.log("Notification emitted to user:", req.user._id.toString());
    }

    res.json({
      success: true,
      message: "Test notification sent",
      data: {
        title: title || "Test Notification",
        message: message || "This is a test notification",
        type: type,
        userId: req.user._id,
      }
    });
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({ message: "Error sending test notification" });
  }
});

export default router;
