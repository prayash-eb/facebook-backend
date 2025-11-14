import type { Request, Response, NextFunction } from "express";
import { Friendship } from "../models/friendship.model.js";
import { User } from "../models/user.model.js";

export const createFriendRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { targetId } = req.body;
        const targetUser = await User.findById(targetId)
        if (!targetUser) {
            return res.status(404).json({ message: "Target User Not Found" })
        }
        const userIds = [userId, targetId].sort()
        const friendRequest = await Friendship.create({
            userIds,
            actionUser: userId,
            status: "pending"
        })
        if (!friendRequest) {
            return res.status(400).json({ message: "Error while sending friend request" })
        }
        res.status(200).json({ message: "Friend Requst sent successfully", userId, targetId })
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
        const userId = req.user?.id

        const friendRequests = await Friendship.find({
            userIds: userId,
            actionUser: { $ne: userId },
            status: "pending"
        }).populate("actionUser", "fullName profilePic");

        res.json({ friendRequests });
    } catch (error) {
        next(error);
    }
};

export const getFriends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const friendships = await Friendship.find({
            userIds: userId,
            status: "accepted"
        }).populate("userIds", "fullName profilePic");

        const friends = friendships.map(f => {
            return f.userIds.find(u => !u._id.equals(userId));
        });

        res.json({ friends });
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
            actionUser: targetId,
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