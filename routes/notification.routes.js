// routes/notification.routes.js
import express from "express";
import Notification from "../models/notification.model.js";

const router = express.Router();

// Get notifications for a user
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  const notifications = await Notification.find({ user: userId }).sort({
    createdAt: -1,
  });
  res.json(notifications);
});

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  const { id } = req.params;
  const notif = await Notification.findByIdAndUpdate(
    id,
    { read: true },
    { new: true }
  );
  res.json(notif);
});

// Create notification (admin/system action)
router.post("/", async (req, res) => {
  const { user, title, message, type } = req.body;
  const notif = new Notification({ user, title, message, type });
  await notif.save();
  res.status(201).json(notif);
});

export default router;
