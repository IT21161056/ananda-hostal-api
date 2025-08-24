// notification.controller.js
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import asyncHandler from "express-async-handler";

/**
 * Send notifications to users with specific roles
 * @param {Array} userIds - List of user IDs to notify
 * @param {Object} notificationData - Notification content
 * @param {String} notificationData.title - Notification title
 * @param {String} notificationData.message - Notification message
 * @param {String} notificationData.type - Notification type (info, warning, error, etc.)
 * @param {Object} req - Express request object (optional, for accessing io)
 */
const sendNotifications = asyncHandler(
  async (userIds, notificationData, req = null) => {
    const { title, message, type = "info" } = notificationData;

    // Create notifications for each user
    const notificationPromises = userIds.map((userId) => {
      return Notification.create({
        user: userId,
        type,
        title,
        message,
      });
    });

    await Promise.all(notificationPromises);

    // Send real-time notifications via Socket.io (if available)
    let io = null;
    if (req && req.app && req.app.get("io")) {
      io = req.app.get("io");
    } else if (req && req.io) {
      io = req.io; // Alternative: if io is attached directly to req
    }

    if (io) {
      userIds.forEach((userId) => {
        io.to(userId.toString()).emit("notification", {
          title,
          message,
          type,
          createdAt: new Date(),
        });
      });
    }

    console.log(`Successfully sent notifications to ${userIds.length} users`);
    return { success: true, count: userIds.length };
  }
);

/**
 * Get user IDs by roles (excluding specified user)
 * @param {Array} roles - Array of roles to include
 * @param {String} excludeUserId - User ID to exclude
 * @returns {Promise<Array>} - Array of user IDs
 */

const getUserIdsByRoles = asyncHandler(async (roles, excludeUserId = null) => {
  const query = { role: { $in: roles } };

  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const users = await User.find(query).select("_id");
  return users.map((user) => user._id);
});

export { sendNotifications, getUserIdsByRoles };
