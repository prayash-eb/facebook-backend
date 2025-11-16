import type { Request, Response, NextFunction } from "express";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Types } from "mongoose";
import { Share } from "../models/share.model.js";
import { isValidObjectId } from "../utils/validation.js";

export const sharePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;

        if (!postId || !isValidObjectId(postId)) {
            return res.status(400).json({ message: "Invalid post ID" });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user already shared this post
        const existingShare = await Share.findOne({ userId, postId });
        if (existingShare) {
            return res.status(400).json({ message: "You have already shared this post" });
        }

        // Create share record
        const share = await Share.create({
            userId,
            postId
        });

        // Update post share count
        post.shareCount += 1;
        await post.save();

        return res.status(201).json({
            message: "Post shared successfully",
            share
        });
    } catch (error) {
        next(error);
    }
};

export const unsharePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;

        if (!postId || !isValidObjectId(postId)) {
            return res.status(400).json({ message: "Invalid post ID" });
        }

        const share = await Share.findOne({ userId, postId });
        if (!share) {
            return res.status(404).json({ message: "Share not found" });
        }

        await share.deleteOne();

        // Update post share count
        const post = await Post.findById(postId);
        if (post) {
            post.shareCount = Math.max(0, post.shareCount - 1);
            await post.save();
        }

        return res.status(200).json({
            message: "Post unshared successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const getUserShares = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const shares = await Share.find({ userId })
            .populate({
                path: "postId",
                select: "textContent media privacy reactionsCount commentsCount shareCount fullName userAvatar createdAt"
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Share.countDocuments({ userId });

        return res.status(200).json({
            message: "Shares fetched successfully",
            shares,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        next(error);
    }
};

export const getPostShares = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { postId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const skip = (Number(page) - 1) * Number(limit);
        const shares = await Share.find({ postId })
            .populate("userId", "fullName profilePic")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Share.countDocuments({ postId });

        return res.status(200).json({
            message: "Post shares fetched successfully",
            shares,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        next(error);
    }
};

export const checkUserShared = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;

        const share = await Share.findOne({ userId, postId });

        return res.status(200).json({
            message: "Share status checked",
            hasShared: !!share
        });
    } catch (error) {
        next(error);
    }
};
