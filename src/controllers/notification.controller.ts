import type { Request, Response, NextFunction } from "express";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { isValidObjectId, sanitizeString } from "../utils/validation.js";

export const createNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId, notificationType, notificationMessage } = req.body;

        if (!userId || !isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        if (!notificationType) {
            return res.status(400).json({ message: "Notification type is required" });
        }

        if (!notificationMessage || notificationMessage.trim().length === 0) {
            return res.status(400).json({ message: "Notification message is required" });
        }

        if (notificationMessage.length > 500) {
            return res.status(400).json({ message: "Notification message cannot exceed 500 characters" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const notification = await Notification.create({
            userId,
            notificationType,
            notificationMessage: sanitizeString(notificationMessage)
        });

        return res.status(201).json({
            message: "Notification created successfully",
            notification
        });
    } catch (error) {
        next(error);
    }
};

export const getUserNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { page = 1, limit = 20, notificationType } = req.query;

        const query: any = { userId };
        if (notificationType) {
            query.notificationType = notificationType;
        }

        const skip = (Number(page) - 1) * Number(limit);
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Notification.countDocuments(query);

        return res.status(200).json({
            message: "Notifications fetched successfully",
            notifications,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        next(error);
    }
};

export const markNotificationAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { notificationId } = req.params;

        if (!notificationId || !isValidObjectId(notificationId)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        if (!notification.userId.equals(userId)) {
            return res.status(403).json({ message: "Not authorized to access this notification" });
        }

        // You can add an 'isRead' field to the model if needed
        // For now, we'll just return success
        return res.status(200).json({
            message: "Notification marked as read",
            notification
        });
    } catch (error) {
        next(error);
    }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { notificationId } = req.params;

        if (!notificationId || !isValidObjectId(notificationId)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        if (!notification.userId.equals(userId)) {
            return res.status(403).json({ message: "Not authorized to delete this notification" });
        }

        await notification.deleteOne();

        return res.status(200).json({
            message: "Notification deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const deleteAllNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

        const result = await Notification.deleteMany({ userId });

        return res.status(200).json({
            message: "All notifications deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        next(error);
    }
};

export const getUnreadNotificationsCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

        // This assumes you'll add an 'isRead' field to the notification model
        // For now, return total count
        const count = await Notification.countDocuments({ userId });

        return res.status(200).json({
            message: "Unread notifications count fetched successfully",
            count
        });
    } catch (error) {
        next(error);
    }
};
