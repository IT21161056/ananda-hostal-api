// routes/notification.routes.js
import express from "express";
import Notification from "../models/notification.model.js";
import { protect, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// Get notifications for the current user
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

// Get notifications for a specific user (admin only)
router.get("/:userId", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ user: userId }).sort({
      createdAt: -1,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

// Mark notification as read
router.put("/:id/read", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { read: true },
      { new: true }
    );
    
    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    res.json(notif);
  } catch (error) {
    res.status(500).json({ message: "Error updating notification" });
  }
});

// Create notification (admin/system action)
router.post("/", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const { user, title, message, type } = req.body;
    const notif = new Notification({ user, title, message, type });
    await notif.save();
    res.status(201).json(notif);
  } catch (error) {
    res.status(500).json({ message: "Error creating notification" });
  }
});

export default router;
