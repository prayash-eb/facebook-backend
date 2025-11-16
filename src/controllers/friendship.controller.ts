import type { Request, Response, NextFunction } from "express";
import { Friendship } from "../models/friendship.model.js";
import { User } from "../models/user.model.js";
import { isValidObjectId } from "../utils/validation.js";

export const createFriendRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { targetId } = req.body;

        if (!targetId) {
            return res.status(400).json({ message: "Target user ID is required" });
        }

        if (!isValidObjectId(targetId)) {
            return res.status(400).json({ message: "Invalid target user ID" });
        }

        if (userId === targetId) {
            return res.status(400).json({ message: "You cannot send friend request to yourself" });
        }

        const targetUser = await User.findById(targetId)
        if (!targetUser) {
            return res.status(404).json({ message: "Target User Not Found" })
        }

        const userIds = [userId, targetId].sort()

        // Check if friendship already exists
        const existingFriendship = await Friendship.findOne({ userIds });
        if (existingFriendship) {
            if (existingFriendship.status === "accepted") {
                return res.status(400).json({ message: "Already friends" });
            } else {
                return res.status(400).json({ message: "Friend request already sent" });
            }
        }

        const friendRequest = await Friendship.create({
            userIds,
            actionUser: userId,
            status: "pending"
        })
        if (!friendRequest) {
            return res.status(400).json({ message: "Error while sending friend request" })
        }
        return res.status(201).json({ message: "Friend Request sent successfully", friendRequest })
    } catch (error) {
        next(error)
    }
}

export const acceptFriendRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { targetId } = req.body;
        // check if friend requests exists
        const userIds = [userId, targetId].sort();
        const friendRequest = await Friendship.findOne({
            userIds,
            actionUser: targetId,
            status: "pending"
        })
        if (!friendRequest) {
            return res.status(404).json({ message: "Friend request not found" })
        }

        friendRequest.status = "accepted";
        await friendRequest.save();

        return res.status(200).json({ message: "Friend Request Accepted", userId, targetId })
    } catch (error) {
        next(error)
    }
}

export const getFriendRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const friendRequests = await Friendship.find({
            userIds: userId,
            actionUser: { $ne: userId },
            status: "pending"
        })
            .populate("actionUser", "fullName profilePic bio")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Friendship.countDocuments({
            userIds: userId,
            actionUser: { $ne: userId },
            status: "pending"
        });

        return res.status(200).json({ 
            message: "Friend requests fetched successfully",
            friendRequests,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        next(error);
    }
};

export const getFriends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const friendships = await Friendship.find({
            userIds: userId,
            status: "accepted"
        })
            .populate("userIds", "fullName profilePic bio followersCount followingsCount")
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const friends = friendships.map(f => {
            return f.userIds.find(u => !u._id.equals(userId));
        });

        const total = await Friendship.countDocuments({
            userIds: userId,
            status: "accepted"
        });

        return res.status(200).json({ 
            message: "Friends fetched successfully",
            friends,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        next(error);
    }
};

export const deleteFriendRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { targetId } = req.body;
        const userIds = [userId, targetId].sort()
        const friendRequest = await Friendship.findOne({
            userIds,
            status: "pending"
        })
        if (!friendRequest) {
            return res.status(404).json({ message: "Friend Request not found" })
        }

        await friendRequest.deleteOne()
        return res.status(200).json({ message: "Friend request deleted" })
    } catch (error) {
        next(error)
    }
}

export const unfriend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { targetId } = req.body;
        const userIds = [userId, targetId].sort()
        const friendship = await Friendship.findOne({
            userIds,
            status: "accepted"
        })
        if (!friendship) {
            return res.status(404).json({ message: "Friendship not found" })
        }

        await friendship.deleteOne()
        return res.status(200).json({ message: "Unfriended successfully" })
    } catch (error) {
        next(error)
    }
}