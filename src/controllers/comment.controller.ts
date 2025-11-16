import type { Request, Response, NextFunction } from "express";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { OutlierComment } from "../models/outlier_comment.model.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../libs/cloudinary.js";
import { Types } from "mongoose";
import { outlierThresholdService } from "../services/outlier-threshold.service.js";
import { sanitizeString } from "../utils/validation.js";
import { logControllerAction, logError, logValidationError } from "../utils/logger.js";

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;
        const { comment, parentCommentId } = req.body;
        logControllerAction('CommentController', 'createComment', userId?.toString(), { postId, hasMedia: !!req.file });

        // Validate input
        if (!comment && !req.file) {
            logValidationError('comment', comment, 'Comment must have text or media', { postId, userId: userId?.toString() });
            return res.status(400).json({ message: "Comment must have text or media" });
        }

        if (comment && comment.length > 2000) {
            logValidationError('comment', comment.length, 'Comment too long', { postId, userId: userId?.toString() });
            return res.status(400).json({ message: "Comment cannot exceed 2000 characters" });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Handle media upload if present
        let mediaUrl: string | undefined;
        const file = req.file;
        if (file) {
            const result = await uploadToCloudinary(file, "comments");
            mediaUrl = result.secure_url;
        }

        // Sanitize comment text
        const sanitizedComment = comment ? sanitizeString(comment, 2000) : "";

        // Get the current outlier threshold using the service
        const commentThreshold = await outlierThresholdService.getCommentThreshold();

        // Check if post has reached outlier status
        if (post.commentsCount >= commentThreshold) {
            // Store in outlier bucket
            const bucketSize = 100; // Define bucket size
            const bucketIndex = Math.floor(post.commentsCount / bucketSize);
            const bucketId = `${postId}_${bucketIndex}`;

            let outlierBucket = await OutlierComment.findOne({
                postId,
                bucketId,
                isFull: false
            });

            if (!outlierBucket) {
                outlierBucket = await OutlierComment.create({
                    postId,
                    bucketId,
                    comments: [],
                    isFull: false,
                    count: 0
                });
            }

            // Add comment to bucket
            outlierBucket.comments.push({
                userId: new Types.ObjectId(userId),
                fullName: user.fullName,
                textContent: sanitizedComment,
                media: mediaUrl || "",
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date()
            } as any);

            outlierBucket.count += 1;

            // Mark bucket as full if it reaches bucket size
            if (outlierBucket.count >= bucketSize) {
                outlierBucket.isFull = true;
            }

            await outlierBucket.save();

            // Update post comment count and recent comments
            post.commentsCount += 1;
            
            // Update recent comments (keep last 3)
            const newRecentComment = {
                commentId: new Types.ObjectId(),
                userId: new Types.ObjectId(userId),
                fullName: user.fullName,
                comment: sanitizedComment,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            post.recentComments.unshift(newRecentComment as any);
            if (post.recentComments.length > 3) {
                post.recentComments = post.recentComments.slice(0, 3);
            }

            await post.save();

            return res.status(201).json({
                message: "Comment added successfully (outlier)",
                comment: newRecentComment,
                isOutlier: true
            });
        } else {
            // Store in regular Comment collection
            const newComment = await Comment.create({
                userId,
                postId,
                comment: sanitizedComment,
                parentCommentId: parentCommentId || null,
                media: mediaUrl
            });

            if (!newComment) {
                return res.status(400).json({ message: "Error while creating comment" });
            }

            // Update post comment count and recent comments
            post.commentsCount += 1;
            
            const newRecentComment = {
                commentId: newComment._id,
                userId: new Types.ObjectId(userId),
                fullName: user.fullName,
                comment: sanitizedComment,
                createdAt: newComment.createdAt,
                updatedAt: newComment.updatedAt
            };
            
            post.recentComments.unshift(newRecentComment as any);
            if (post.recentComments.length > 3) {
                post.recentComments = post.recentComments.slice(0, 3);
            }

            await post.save();

            return res.status(201).json({
                message: "Comment created successfully",
                comment: newComment,
                isOutlier: false
            });
        }
    } catch (error) {
        next(error);
    }
};

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { postId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const commentThreshold = await outlierThresholdService.getCommentThreshold();

        if (post.commentsCount >= commentThreshold) {
            // Fetch from outlier buckets
            const outlierBuckets = await OutlierComment.find({ postId })
                .sort({ createdAt: -1 });

            // Flatten all comments from all buckets
            const allComments = outlierBuckets.flatMap(bucket =>
                bucket.comments.filter(c => !c.isDeleted)
            );

            // Manual pagination on flattened array
            const skip = (Number(page) - 1) * Number(limit);
            const paginatedComments = allComments.slice(skip, skip + Number(limit));

            return res.status(200).json({
                message: "Comments fetched successfully",
                comments: paginatedComments,
                total: allComments.length,
                page: Number(page),
                totalPages: Math.ceil(allComments.length / Number(limit)),
                isOutlier: true
            });
        } else {
            // Fetch from regular Comment collection
            const skip = (Number(page) - 1) * Number(limit);
            const comments = await Comment.find({ postId, parentCommentId: null })
                .populate("userId", "fullName profilePic")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit));

            const total = await Comment.countDocuments({ postId, parentCommentId: null });

            return res.status(200).json({
                message: "Comments fetched successfully",
                comments,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                isOutlier: false
            });
        }
    } catch (error) {
        next(error);
    }
};

export const getReplies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { commentId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const replies = await Comment.find({ parentCommentId: commentId })
            .populate("userId", "fullName profilePic")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Comment.countDocuments({ parentCommentId: commentId });

        return res.status(200).json({
            message: "Replies fetched successfully",
            replies,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        next(error);
    }
};

export const updateComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { commentId } = req.params;
        const { comment } = req.body;

        // Validate input
        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        if (comment.length > 2000) {
            return res.status(400).json({ message: "Comment cannot exceed 2000 characters" });
        }

        const existingComment = await Comment.findById(commentId);
        if (!existingComment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        if (!existingComment.userId.equals(userId)) {
            return res.status(403).json({ message: "Not authorized to update this comment" });
        }

        existingComment.comment = sanitizeString(comment, 2000);
        await existingComment.save();

        return res.status(200).json({
            message: "Comment updated successfully",
            comment: existingComment
        });
    } catch (error) {
        next(error);
    }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { commentId } = req.params;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        const post = await Post.findById(comment.postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Check if user owns the comment or the post
        if (!comment.userId.equals(userId) && !post.userId.equals(userId)) {
            return res.status(403).json({ message: "Not authorized to delete this comment" });
        }

        // Count replies to subtract from post count
        const repliesCount = await Comment.countDocuments({ parentCommentId: commentId });

        // Delete all replies first
        await Comment.deleteMany({ parentCommentId: commentId });

        // Delete the comment
        await comment.deleteOne();

        // Update post comment count (subtract comment + all its replies)
        post.commentsCount = Math.max(0, post.commentsCount - (1 + repliesCount));
        
        // Remove from recent comments if present
        post.recentComments = post.recentComments.filter(
            rc => !rc.commentId.equals(commentId)
        );
        
        await post.save();

        return res.status(200).json({
            message: "Comment deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};