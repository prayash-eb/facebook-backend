import type { Request, Response, NextFunction } from "express";
import { Reaction, type ReactionType } from "../models/reaction.model.js";
import { Post } from "../models/post.model.js";
import { OutlierReaction } from "../models/outlier_reaction.model.js";
import { Types } from "mongoose";
import { outlierThresholdService } from "../services/outlier-threshold.service.js";
import { User } from "../models/user.model.js";
import { Friendship } from "../models/friendship.model.js";
import { ceil, floor, max } from "../utils/convert.js";

export const createOrUpdateReaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;
        const { reactionType } = req.body as { reactionType: ReactionType };

        // --- validate user and reactionType
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const validReactions: ReactionType[] = ['like', 'love', 'care', 'angry', 'sad'];
        if (!reactionType || !validReactions.includes(reactionType)) {
            return res.status(400).json({
                message: "Invalid reaction type. Must be one of: like, love, care, angry, sad"
            });
        }

        // --- fetch post
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        // --- privacy checks
        if (post.privacy === "onlyme" && !post.userId.equals(userId)) {
            return res.status(403).json({ message: "You cannot react to this post" });
        }
        if (post.privacy === "friends" && !post.userId.equals(userId)) {
            const isFriend = await Friendship.findOne({
                userIds: { $all: [post.userId, userId] },
                status: "accepted"
            });
            if (!isFriend) {
                return res.status(403).json({ message: "You must be friends with this user to react" });
            }
        }

        // --- threshold
        const reactionThreshold = await outlierThresholdService.getReactionThreshold();
        const isOutlierPost = post.reactionsCount >= reactionThreshold;

      
        const outlierBucket = await OutlierReaction.findOne({
            postId: post._id,
            'reactions.userId': new Types.ObjectId(userId),
            'reactions.isDeleted': false
        });

        // If outlier bucket found, locate the user's subdocument
        if (outlierBucket) {
            const userReactionIndex = outlierBucket.reactions.findIndex(r => r.userId.equals(userId) && !r.isDeleted);
            if (userReactionIndex !== -1) {
                // Update the subdocument in-place
                outlierBucket.reactions[userReactionIndex]!.reactionType = reactionType;
                await outlierBucket.save();

                return res.status(200).json({
                    message: "Reaction updated successfully (outlier)",
                    reactionType,
                    isOutlier: true
                });
            }
        }

        // Not found in outlier: check normal Reaction collection
        const normalReaction = await Reaction.findOne({ postId, userId });

        if (normalReaction) {
            // Update the normal reaction document
            normalReaction.reactionType = reactionType;
            await normalReaction.save();

            return res.status(200).json({
                message: "Reaction updated successfully",
                reaction: normalReaction,
                isOutlier: false
            });
        }

        if (isOutlierPost) {
            // Prefer to find an existing non-full bucket for this post.
            // Attempt to find a non-full bucket first (most generic approach).
            let targetBucket = await OutlierReaction.findOne({ postId: post._id, isFull: false });

            // If no non-full bucket exists, compute bucketId by bucketIndex and create new bucket.
            if (!targetBucket) {
                const bucketSize = 100;
                const bucketIndex = Math.floor(post.reactionsCount / bucketSize);
                const bucketId = `${postId}_${bucketIndex}`;

                targetBucket = await OutlierReaction.create({
                    postId: post._id,
                    bucketId,
                    reactions: [],
                    isFull: false,
                    count: 0
                });
            }

            // push the new reaction subdocument
            targetBucket.reactions.push({
                userId: new Types.ObjectId(userId),
                reactionType,
                isDeleted: false
            } as any);

            targetBucket.count = (targetBucket.count || 0) + 1;
            if (targetBucket.count >= 100) targetBucket.isFull = true;
            await targetBucket.save();

            // update post counters
            post.reactionsCount += 1;
            post.isViral = true;
            await post.save();

            return res.status(201).json({
                message: "Reaction added successfully (outlier)",
                reactionType,
                isOutlier: true
            });
        } else {
            // create normal reaction document
            const newReaction = await Reaction.create({
                postId,
                userId,
                reactionType
            });

            post.reactionsCount += 1;
            await post.save();

            return res.status(201).json({
                message: "Reaction added successfully",
                reaction: newReaction,
                isOutlier: false
            });
        }
    } catch (error) {
        next(error);
    }
};

export const removeReaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        let reactionRemoved = false;
        const reaction = await Reaction.findOne({ userId, postId });
        if (reaction) {
            await reaction.deleteOne();
            reactionRemoved = true;
        }
        if (!reactionRemoved) {
            const outlierBuckets = await OutlierReaction.find({ postId });
            for (const bucket of outlierBuckets) {
                const index = bucket.reactions.findIndex(
                    r => r.userId.equals(userId) && !r.isDeleted
                );
                if (index !== -1) {
                    bucket.reactions[index]!.isDeleted = true;
                    bucket.count = max(0, bucket.count - 1);
                    await bucket.save();
                    reactionRemoved = true;
                    break;
                }
            }
        }

        if (!reactionRemoved) {
            return res.status(404).json({ message: "Reaction not found" });
        }
        post.reactionsCount = max(0, post.reactionsCount - 1);
        await post.save();

        return res.status(200).json({
            message: "Reaction removed successfully"
        });

    } catch (error) {
        next(error);
    }
};

export const getReactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { postId } = req.params;
        const { page = 1, limit = 50, reactionType } = req.query;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const normalQuery: any = { postId };
        if (reactionType) normalQuery.reactionType = reactionType;

        const normalReactions = await Reaction.find(normalQuery)
            .populate("userId", "fullName profilePic")
            .sort({ createdAt: -1 })
            .lean();

        const outlierBuckets = await OutlierReaction.find({ postId }).lean();

        let outlierReactions = outlierBuckets.flatMap(bucket =>
            bucket.reactions.filter(r => !r.isDeleted)
        );

        if (reactionType) {
            outlierReactions = outlierReactions.filter(r => r.reactionType === reactionType);
        }

        // Populate user info for outlier reactions
        const userIds = [...new Set(outlierReactions.map(r => r.userId.toString()))];
        const users = await User.find({ _id: { $in: userIds } }).select("fullName profilePic").lean();
        const userMap = new Map(users.map(u => [u._id.toString(), u]));

        const outlierReactionsWithUser = outlierReactions.map(r => ({
            reactionId: r._id,
            userId: r.userId,
            fullName: userMap.get(r.userId.toString())?.fullName || "",
            profilePic: userMap.get(r.userId.toString())?.profilePic || null,
            reactionType: r.reactionType,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
        }));


        const allReactions = [...normalReactions, ...outlierReactionsWithUser].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const paginatedReactions = allReactions.slice(skip, skip + limitNum);

        return res.status(200).json({
            message: "Reactions fetched successfully",
            reactions: paginatedReactions,
            total: allReactions.length,
            page: pageNum,
            totalPages: ceil(allReactions.length / limitNum)
        });

    } catch (error) {
        next(error);
    }
};

export const getReactionsSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { postId } = req.params;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const summary: Record<ReactionType, number> = {
            like: 0,
            love: 0,
            care: 0,
            angry: 0,
            sad: 0
        };

        const normalReactions = await Reaction.aggregate([
            { $match: { postId: new Types.ObjectId(postId) } },
            { $group: { _id: "$reactionType", count: { $sum: 1 } } }
        ]);

        normalReactions.forEach(r => {
            summary[r._id as ReactionType] = (summary[r._id as ReactionType] || 0) + r.count;
        });


        const outlierBuckets = await OutlierReaction.find({ postId }).lean();
        outlierBuckets.forEach(bucket => {
            bucket.reactions.forEach(r => {
                if (!r.isDeleted) {
                    summary[r.reactionType] = (summary[r.reactionType] || 0) + 1;
                }
            });
        });

        return res.status(200).json({
            message: "Reactions summary fetched successfully",
            summary,
            total: post.reactionsCount
        });

    } catch (error) {
        next(error);
    }
};

export const getUserReaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const reactionThreshold = await outlierThresholdService.getReactionThreshold();

        if (post.reactionsCount >= reactionThreshold) {
            // Search in outlier buckets
            const outlierBuckets = await OutlierReaction.find({ postId });

            for (const bucket of outlierBuckets) {
                const userReaction = bucket.reactions.find(
                    r => r.userId.equals(userId) && !r.isDeleted
                );

                if (userReaction) {
                    return res.status(200).json({
                        message: "User reaction found",
                        reaction: {
                            reactionType: userReaction.reactionType
                        }
                    });
                }
            }

            return res.status(404).json({ message: "User has not reacted to this post" });
        } else {
            // Search in regular Reaction collection
            const reaction = await Reaction.findOne({ userId, postId });

            if (!reaction) {
                return res.status(404).json({ message: "User has not reacted to this post" });
            }

            return res.status(200).json({
                message: "User reaction found",
                reaction
            });
        }
    } catch (error) {
        next(error);
    }
};
