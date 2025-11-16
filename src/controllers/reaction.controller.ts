import type { Request, Response, NextFunction } from "express";
import { Reaction, type ReactionType } from "../models/reaction.model.js";
import { Post } from "../models/post.model.js";
import { OutlierReaction } from "../models/outlier_reaction.model.js";
import { Types } from "mongoose";
import { outlierThresholdService } from "../services/outlier-threshold.service.js";

export const createOrUpdateReaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;
        const { reactionType } = req.body as { reactionType: ReactionType };

        // Validate reaction type
        const validReactions: ReactionType[] = ['like', 'love', 'care', 'angry', 'sad'];
        if (!reactionType || !validReactions.includes(reactionType)) {
            return res.status(400).json({ 
                message: "Invalid reaction type. Must be one of: like, love, care, angry, sad" 
            });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Get the current outlier threshold using the service
        const reactionThreshold = await outlierThresholdService.getReactionThreshold();

        // Check if post has reached outlier status
        if (post.reactionsCount >= reactionThreshold) {
            // Store in outlier bucket
            const bucketSize = 100;
            const bucketIndex = Math.floor(post.reactionsCount / bucketSize);
            const bucketId = `${postId}_${bucketIndex}`;

            let outlierBucket = await OutlierReaction.findOne({
                postId,
                bucketId,
                isFull: false
            });

            if (!outlierBucket) {
                outlierBucket = await OutlierReaction.create({
                    postId,
                    bucketId,
                    reactions: [],
                    isFull: false,
                    count: 0
                });
            }

            // Check if user already reacted in this bucket
            const existingReactionIndex = outlierBucket.reactions.findIndex(
                r => r.userId.equals(userId) && !r.isDeleted
            );

            if (existingReactionIndex !== -1) {
                // Update existing reaction
                const existingReaction = outlierBucket.reactions[existingReactionIndex];
                if (existingReaction) {
                    existingReaction.reactionType = reactionType;
                    await outlierBucket.save();

                    return res.status(200).json({
                        message: "Reaction updated successfully",
                        reactionType,
                        isOutlier: true
                    });
                }
            } else {
                // Add new reaction to bucket
                outlierBucket.reactions.push({
                    userId: new Types.ObjectId(userId),
                    reactionType,
                    isDeleted: false
                } as any);

                outlierBucket.count += 1;

                // Mark bucket as full if it reaches bucket size
                if (outlierBucket.count >= bucketSize) {
                    outlierBucket.isFull = true;
                }

                await outlierBucket.save();

                // Update post reaction count
                post.reactionsCount += 1;
                await post.save();

                return res.status(201).json({
                    message: "Reaction added successfully (outlier)",
                    reactionType,
                    isOutlier: true
                });
            }
        } else {
            // Store in regular Reaction collection
            const existingReaction = await Reaction.findOne({ userId, postId });

            if (existingReaction) {
                // Update existing reaction
                existingReaction.reactionType = reactionType;
                await existingReaction.save();

                return res.status(200).json({
                    message: "Reaction updated successfully",
                    reaction: existingReaction,
                    isOutlier: false
                });
            } else {
                // Create new reaction
                const newReaction = await Reaction.create({
                    userId,
                    postId,
                    reactionType
                });

                // Update post reaction count
                post.reactionsCount += 1;
                await post.save();

                return res.status(201).json({
                    message: "Reaction created successfully",
                    reaction: newReaction,
                    isOutlier: false
                });
            }
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
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const reactionThreshold = await outlierThresholdService.getReactionThreshold();

        if (post.reactionsCount >= reactionThreshold) {
            // Remove from outlier buckets
            const outlierBuckets = await OutlierReaction.find({ postId });

            let reactionRemoved = false;
            for (const bucket of outlierBuckets) {
                const reactionIndex = bucket.reactions.findIndex(
                    r => r.userId.equals(userId) && !r.isDeleted
                );

                if (reactionIndex !== -1) {
                    const reaction = bucket.reactions[reactionIndex];
                    if (reaction) {
                        reaction.isDeleted = true;
                        bucket.count = Math.max(0, bucket.count - 1);
                        await bucket.save();
                        reactionRemoved = true;
                        break;
                    }
                }
            }

            if (reactionRemoved) {
                post.reactionsCount = Math.max(0, post.reactionsCount - 1);
                await post.save();

                return res.status(200).json({
                    message: "Reaction removed successfully"
                });
            } else {
                return res.status(404).json({ message: "Reaction not found" });
            }
        } else {
            // Remove from regular Reaction collection
            const reaction = await Reaction.findOne({ userId, postId });

            if (!reaction) {
                return res.status(404).json({ message: "Reaction not found" });
            }

            await reaction.deleteOne();

            // Update post reaction count
            post.reactionsCount = Math.max(0, post.reactionsCount - 1);
            await post.save();

            return res.status(200).json({
                message: "Reaction removed successfully"
            });
        }
    } catch (error) {
        next(error);
    }
};

export const getReactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { postId } = req.params;
        const { page = 1, limit = 50, reactionType } = req.query;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const reactionThreshold = await outlierThresholdService.getReactionThreshold();

        if (post.reactionsCount >= reactionThreshold) {
            // Fetch from outlier buckets
            const outlierBuckets = await OutlierReaction.find({ postId });

            let reactions = outlierBuckets.flatMap(bucket =>
                bucket.reactions.filter(r => !r.isDeleted)
            );

            // Filter by reaction type if specified
            if (reactionType) {
                reactions = reactions.filter(r => r.reactionType === reactionType);
            }

            // Manual pagination
            const skip = (Number(page) - 1) * Number(limit);
            const paginatedReactions = reactions.slice(skip, skip + Number(limit));

            return res.status(200).json({
                message: "Reactions fetched successfully",
                reactions: paginatedReactions,
                total: reactions.length,
                page: Number(page),
                totalPages: Math.ceil(reactions.length / Number(limit)),
                isOutlier: true
            });
        } else {
            // Fetch from regular Reaction collection
            const skip = (Number(page) - 1) * Number(limit);
            const query: any = { postId };
            
            if (reactionType) {
                query.reactionType = reactionType;
            }

            const reactions = await Reaction.find(query)
                .populate("userId", "fullName profilePic")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit));

            const total = await Reaction.countDocuments(query);

            return res.status(200).json({
                message: "Reactions fetched successfully",
                reactions,
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

export const getReactionsSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { postId } = req.params;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const reactionThreshold = await outlierThresholdService.getReactionThreshold();

        let summary: Record<ReactionType, number> = {
            like: 0,
            love: 0,
            care: 0,
            angry: 0,
            sad: 0
        };

        if (post.reactionsCount >= reactionThreshold) {
            // Count from outlier buckets
            const outlierBuckets = await OutlierReaction.find({ postId });

            outlierBuckets.forEach(bucket => {
                bucket.reactions.forEach(r => {
                    if (!r.isDeleted) {
                        summary[r.reactionType] = (summary[r.reactionType] || 0) + 1;
                    }
                });
            });
        } else {
            // Count from regular Reaction collection
            const reactions = await Reaction.aggregate([
                { $match: { postId: new Types.ObjectId(postId) } },
                { $group: { _id: "$reactionType", count: { $sum: 1 } } }
            ]);

            reactions.forEach(r => {
                summary[r._id as ReactionType] = r.count;
            });
        }

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
