import type { Request, Response, NextFunction } from "express";
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";
import { isValidObjectId } from "../utils/validation.js";
import { ceil } from "../utils/convert.js";

export const followUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const followerId = req.user?.id;
        const { targetId } = req.params;

        if (!targetId || !isValidObjectId(targetId)) {
            return res.status(400).json({ message: "Invalid target user ID" });
        }

        if (followerId?.toString() === targetId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const targetUser = await User.findById(targetId);
        if (!targetUser) {
            return res.status(404).json({ message: "Target user not found" });
        }

        // Check if already following
        const existingFollow = await Follow.findOne({ followerId, targetId });
        if (existingFollow) {
            return res.status(400).json({ message: "You are already following this user" });
        }

        // Create follow relationship
        const follow = await Follow.create({
            followerId,
            targetId
        });

        // Update follower and following counts
        await User.findByIdAndUpdate(followerId, { $inc: { followingsCount: 1 } });
        await User.findByIdAndUpdate(targetId, { $inc: { followersCount: 1 } });

        return res.status(201).json({
            message: "User followed successfully",
            follow
        });
    } catch (error) {
        next(error);
    }
};

export const unfollowUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const followerId = req.user?.id;
        const { targetId } = req.params;

        if (!targetId || !isValidObjectId(targetId)) {
            return res.status(400).json({ message: "Invalid target user ID" });
        }

        const follow = await Follow.findOne({ followerId, targetId });
        if (!follow) {
            return res.status(404).json({ message: "You are not following this user" });
        }

        await follow.deleteOne();

        // Update follower and following counts
        await User.findByIdAndUpdate(followerId, { $inc: { followingsCount: -1 } });
        await User.findByIdAndUpdate(targetId, { $inc: { followersCount: -1 } });

        return res.status(200).json({
            message: "User unfollowed successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const getFollowers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const skip = (Number(page) - 1) * Number(limit);
        const followers = await Follow.find({ targetId: userId })
            .populate("followerId", "fullName profilePic bio followersCount followingsCount")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Follow.countDocuments({ targetId: userId });

        return res.status(200).json({
            message: "Followers fetched successfully",
            followers: followers.map(f => f.followerId),
            total,
            page: Number(page),
            totalPages: ceil(total / Number(limit))
        });
    } catch (error) {
        next(error);
    }
};

export const getFollowing = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const skip = (Number(page) - 1) * Number(limit);
        const following = await Follow.find({ followerId: userId })
            .populate("targetId", "fullName profilePic bio followersCount followingsCount")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Follow.countDocuments({ followerId: userId });

        return res.status(200).json({
            message: "Following fetched successfully",
            following: following.map(f => f.targetId),
            total,
            page: Number(page),
            totalPages: ceil(total / Number(limit))
        });
    } catch (error) {
        next(error);
    }
};

export const checkFollowStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const followerId = req.user?.id;
        const { targetId } = req.params;

        const follow = await Follow.findOne({ followerId, targetId });

        return res.status(200).json({
            message: "Follow status checked",
            isFollowing: !!follow
        });
    } catch (error) {
        next(error);
    }
};

export const getFollowStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Follow stats fetched successfully",
            stats: {
                followersCount: user.followersCount,
                followingsCount: user.followingsCount
            }
        });
    } catch (error) {
        next(error);
    }
};
