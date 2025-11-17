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
import { ceil, floor, max } from "../utils/convert.js";

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
            const bucketIndex = floor(post.commentsCount / bucketSize);
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
            post.isViral = true

            // Update recent comments (keep last 3)
            const newRecentComment = {
                commentId: new Types.ObjectId(),
                userId: new Types.ObjectId(userId),
                fullName: user.fullName,
                comment: sanitizedComment,
                mediaUrl,
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
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Parse pagination params
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const normalCommentsPromise = Comment.find({ postId, parentCommentId: null })
            .populate("userId", "fullName profilePic")
            .sort({ createdAt: -1 })
            .lean();

        const normalCountPromise = Comment.countDocuments({ postId, parentCommentId: null });


        const outlierBuckets = await OutlierComment.find({ postId }).lean();

        const outlierComments = outlierBuckets
            .flatMap(bucket =>
                bucket.comments.filter(c => !c.isDeleted && !c.parentCommentId)
            );

        // Populate user info manually for outlier comments
        const outlierUserIds = [...new Set(outlierComments.map(c => c.userId.toString()))];
        const users = await User.find({ _id: { $in: outlierUserIds } }).select("fullName profilePic").lean();
        const userMap = new Map(users.map(u => [u._id.toString(), u]));

        const outlierCommentsWithUser = outlierComments.map(c => ({
            _id: c._id,
            userId: c.userId,
            fullName: userMap.get(c.userId.toString())?.fullName || c.fullName,
            profilePic: userMap.get(c.userId.toString())?.profilePic || null,
            comment: c.textContent,
            media: c.media,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        }));


        const normalComments = await normalCommentsPromise;
        const totalNormal = await normalCountPromise;

        const allComments = [...normalComments, ...outlierCommentsWithUser]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const paginatedComments = allComments.slice(skip, skip + limitNum);

        return res.status(200).json({
            message: "Comments fetched successfully",
            comments: paginatedComments,
            total: allComments.length,
            page: pageNum,
            totalPages: ceil(allComments.length / limitNum)
        });

    } catch (error) {
        next(error);
    }
};


export const getReplies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { commentId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Normal replies
        const normalRepliesPromise = Comment.find({ parentCommentId: commentId })
            .populate("userId", "fullName profilePic")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const normalCountPromise = Comment.countDocuments({ parentCommentId: commentId });

        // Outlier replies
        const outlierBuckets = await OutlierComment.find({
            "comments.parentCommentId": commentId
        }).lean();

        const allOutlierReplies = outlierBuckets
            .flatMap(bucket =>
                bucket.comments.filter(c =>
                    c.parentCommentId?.toString() === commentId && !c.isDeleted
                )
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const [normalReplies, normalCount] = await Promise.all([normalRepliesPromise, normalCountPromise]);

        // Merge replies (normal first, then outliers if needed)
        const mergedReplies = [...normalReplies, ...allOutlierReplies].slice(0, Number(limit));

        const totalReplies = normalCount + allOutlierReplies.length;

        return res.status(200).json({
            message: "Replies fetched successfully",
            replies: mergedReplies,
            total: totalReplies,
            page: Number(page),
            totalPages: ceil(totalReplies / Number(limit))
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

        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        if (comment.length > 2000) {
            return res.status(400).json({ message: "Comment cannot exceed 2000 characters" });
        }

        const sanitizedComment = sanitizeString(comment, 2000);

        let existingComment = await Comment.findById(commentId);

        if (existingComment) {
            if (!existingComment.userId.equals(userId)) {
                return res.status(403).json({ message: "Not authorized to update this comment" });
            }

            existingComment.comment = sanitizedComment;
            await existingComment.save();

            const post = await Post.findById(existingComment.postId);
            if (post) {
                // Update recentComments
                post.recentComments = post.recentComments.map(rc =>
                    rc.commentId.equals(existingComment._id as Types.ObjectId)
                        ? { ...rc, comment: sanitizedComment, updatedAt: new Date() }
                        : rc
                );
                await post.save();
            }

            return res.status(200).json({
                message: "Comment updated successfully",
                comment: existingComment,
                isOutlier: false
            });
        }

        const bucket = await OutlierComment.findOne({
            "comments._id": commentId
        });

        if (!bucket) {
            return res.status(404).json({ message: "Comment not found" });
        }

        const index = bucket.comments.findIndex(c => (c._id as Types.ObjectId).equals(commentId));
        const target = bucket.comments[index];

        if (!target?.userId.equals(userId)) {
            return res.status(403).json({ message: "Not authorized to update this comment" });
        }

        bucket.comments[index]!.textContent = sanitizedComment;
        bucket.comments[index]!.updatedAt = new Date();
        await bucket.save();

        /** Update in recentComments if present */
        const post = await Post.findById(bucket.postId);
        if (post) {
            post.recentComments = post.recentComments.map(rc =>
                rc.commentId.equals(target._id as Types.ObjectId)
                    ? { ...rc, comment: sanitizedComment, updatedAt: new Date() }
                    : rc
            );
            await post.save();
        }

        return res.status(200).json({
            message: "Comment updated successfully (outlier)",
            comment: bucket.comments[index],
            isOutlier: true
        });

    } catch (error) {
        next(error);
    }
};



async function refillRecentComments(post: any) {
    const needed = 3 - post.recentComments.length;
    if (needed <= 0) return;

    const normal = await Comment.find({ postId: post._id })
        .sort({ createdAt: -1 })
        .limit(needed)
        .lean();

    let outliers: any[] = [];

    if (normal.length < needed) {
        const buckets = await OutlierComment.find({ postId: post._id }).lean();
        outliers = buckets
            .flatMap(b => b.comments.filter(c => !c.isDeleted))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, needed - normal.length);
    }

    const merged = [...normal, ...outliers].map(c => ({
        commentId: c._id,
        userId: c.userId,
        fullName: c.fullName,
        comment: c.comment || c.textContent,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
    }));

    post.recentComments.push(...merged);
}


export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { commentId } = req.params;

        let comment = await Comment.findById(commentId);

        if (comment) {
            const post = await Post.findById(comment.postId);
            if (!post) return res.status(404).json({ message: "Post not found" });

            if (!comment.userId.equals(userId) && !post.userId.equals(userId)) {
                return res.status(403).json({ message: "Not authorized" });
            }

            const repliesCount = await Comment.countDocuments({ parentCommentId: commentId });
            await Comment.deleteMany({ parentCommentId: commentId });
            await comment.deleteOne();

            post.commentsCount = max(0, post.commentsCount - (1 + repliesCount));
            post.recentComments = post.recentComments.filter(rc => !rc.commentId.equals(commentId));

            await refillRecentComments(post);
            await post.save();

            return res.status(200).json({
                message: "Comment deleted successfully",
                isOutlier: false
            });
        }


        const bucket = await OutlierComment.findOne({ "comments._id": commentId });
        if (!bucket) return res.status(404).json({ message: "Comment not found" });

        const index = bucket.comments.findIndex(c => (c._id as Types.ObjectId).equals(commentId));
        const target = bucket.comments[index];

        const post = await Post.findById(bucket.postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (!target?.userId.equals(userId) && !post.userId.equals(userId)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Soft delete in outlier bucket
        bucket.comments[index]!.isDeleted = true;
        bucket.count = max(0, bucket.count - 1);
        await bucket.save();

        post.commentsCount = max(0, post.commentsCount - 1);
        post.recentComments = post.recentComments.filter(rc => !rc.commentId.equals(commentId));

        await refillRecentComments(post);
        await post.save();

        return res.status(200).json({
            message: "Comment deleted successfully (outlier)",
            isOutlier: true
        });

    } catch (error) {
        next(error);
    }
};

