import { Router } from "express";
import {
    createNotification,
    getUserNotifications,
    markNotificationAsRead,
    deleteNotification,
    deleteAllNotifications,
    getUnreadNotificationsCount
} from "../controllers/notification.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";

const router = Router();

// Create a notification (usually called by system/other controllers)
router.post("/", createNotification);

// Get user's notifications
router.get("/", requireAuthentication, getUserNotifications);

// Get unread notifications count
router.get("/unread/count", requireAuthentication, getUnreadNotificationsCount);

// Mark notification as read
router.put("/:notificationId/read", requireAuthentication, markNotificationAsRead);

// Delete a notification
router.delete("/:notificationId", requireAuthentication, deleteNotification);

// Delete all notifications
router.delete("/", requireAuthentication, deleteAllNotifications);

export default router;
