import type { Request, Response, NextFunction } from "express";
import { Post, type IPost } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from "../middleware/upload.middleware.js";
import { uploadToCloudinary } from "../libs/cloudinary.js";
import { Types } from "mongoose";
import { Friendship } from "../models/friendship.model.js";
import { sanitizeString } from "../utils/validation.js";
import { logControllerAction, logError, logValidationError } from "../utils/logger.js";

export const createPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { textContent, privacy, tags, postType } = JSON.parse(req.body.data);
        logControllerAction('PostController', 'createPost', userId?.toString(), { 
            privacy, 
            postType,
            hasMedia: !!(req.files && (req.files as any[]).length > 0)
        });

        const files = req.files as Express.Multer.File[] | undefined;

        if (!textContent && (!files || files.length === 0)) {
            logValidationError('post', undefined, 'Post must have text or media', { userId: userId?.toString() });
            return res.status(400).json({ message: "Post must have text or media" });
        }

        // Validate text content length
        if (textContent && textContent.length > 5000) {
            logValidationError('textContent', textContent.length, 'Text too long', { userId: userId?.toString() });
            return res.status(400).json({ message: "Post text content cannot exceed 5000 characters" });
        }

        // Validate privacy value
        const validPrivacyOptions = ['public', 'friends', 'onlyme'];
        if (privacy && !validPrivacyOptions.includes(privacy)) {
            return res.status(400).json({ 
                message: `Invalid privacy option. Must be one of: ${validPrivacyOptions.join(', ')}` 
            });
        }

        let media: { mediaType: string; url: string }[] = [];

        if (files && files.length > 0) {
            // Validate size and type before uploading
            for (const file of files) {
                if (file.mimetype.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
                    return res.status(400).json({
                        message: `Image ${file.originalname} exceeds ${MAX_IMAGE_SIZE / (1024 * 1024)}MB limit`,
                    });
                }
                if (file.mimetype.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
                    return res.status(400).json({
                        message: `Video ${file.originalname} exceeds ${MAX_VIDEO_SIZE / (1024 * 1024)}MB limit`,
                    });
                }
            }

            // map(async) returns an array of promises, and Promise.all allows for concurrent uploads

            media = await Promise.all(
                files.map(async (file) => {
                    const result = await uploadToCloudinary(file, "posts");
                    return { mediaType: result.resource_type, url: result.secure_url };
                })
            );
        }

        const user = await User.findById(userId);

        const newPost = new Post({
            userId: new Types.ObjectId(userId),
            fullName: user?.fullName,
            userAvatar: user?.profilePic || "",
            textContent: textContent ? sanitizeString(textContent) : undefined,
            media,
            privacy: privacy || "friends",
            tags: tags ? tags.map((id: string) => new Types.ObjectId(id)) : [],
            postType: postType || "post",
            reactionsCount: 0,
            commentsCount: 0,
            shareCount: 0,
            isViral: false,
            recentComments: [],
        });

        await newPost.save();
        return res.status(201).json({ message: `${postType === "story" ? "Story" : "Post"} created successfully`, post: newPost })
    } catch (error) {
        next(error)
    }
}

export const getSinglePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" })
        }

        // Check if user owns the post or post is public
        if (post.userId.equals(userId) || post?.privacy === "public") {
            return res.status(200).json({ message: "Post Fetched Successfully", post })
        }

        // Check if post is private (onlyme) - only owner can see
        if (post?.privacy === "onlyme") {
            return res.status(403).json({ message: "This post is private" })
        }

        const users = [userId, post?.userId.toString()].sort()

        // Check if post is for friends only
        if (post?.privacy === "friends") {
            const areFriends = await Friendship.findOne({
                userIds: { $all: users },
                status: "accepted"
            })
            if (!areFriends) {
                return res.status(403).json({ message: "Post visibility is only for friends" })
            }
        }
        return res.status(200).json({ message: "Post fetched successfully", post })

    } catch (error) {
        next(error)
    }
}

export const getPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const posts = await Post.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Post.countDocuments({ userId });

        return res.status(200).json({ 
            message: "Posts fetched successfully", 
            posts,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        next(error)
    }
}

export const editPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post Not Found" });
        }
        if (!post.userId.equals(userId)) {
            return res.status(403).json({ message: "Forbidden to edit other posts" })
        }

        const { textContent, privacy, tags } = JSON.parse(req.body.data);
        const files = req.files as Express.Multer.File[] | undefined;

        // Validate text content length
        if (textContent && textContent.length > 5000) {
            return res.status(400).json({ message: "Post text content cannot exceed 5000 characters" });
        }

        // Validate privacy value
        const validPrivacyOptions = ['public', 'friends', 'onlyme'];
        if (privacy && !validPrivacyOptions.includes(privacy)) {
            return res.status(400).json({ 
                message: `Invalid privacy option. Must be one of: ${validPrivacyOptions.join(', ')}` 
            });
        }

        let media: { mediaType: string; url: string }[] = [];

        if (files && files.length > 0) {
            // Validate size and type before uploading
            for (const file of files) {
                if (file.mimetype.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
                    return res.status(400).json({
                        message: `Image ${file.originalname} exceeds ${MAX_IMAGE_SIZE / (1024 * 1024)}MB limit`,
                    });
                }
                if (file.mimetype.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
                    return res.status(400).json({
                        message: `Video ${file.originalname} exceeds ${MAX_VIDEO_SIZE / (1024 * 1024)}MB limit`,
                    });
                }
            }

            media = await Promise.all(
                files.map(async (file) => {
                    const result = await uploadToCloudinary(file, "posts");
                    return { mediaType: result.resource_type, url: result.secure_url };
                })
            );
        }

        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            {
                textContent: textContent ? sanitizeString(textContent) : undefined,
                privacy,
                tags,
                media: media.length > 0 ? media : undefined
            },
            { new: true }
        );

        if (!updatedPost) {
            return res.status(400).json({ message: "Error while updating post" })
        }
        return res.status(200).json({ message: "Post updated successfully", post: updatedPost })

    } catch (error) {
        next(error)

    }
}

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post Not Found" })
        }
        if (!post.userId.equals(userId)) {
            return res.status(403).json({ message: "Not allowed to delete others post" })
        }
        await post.deleteOne();
        return res.status(200).json({ message: "Post deleted successfully" })
    } catch (error) {
        next(error)
    }
}

export const getAllPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 20, postType } = req.query;

        const query: any = {};
        if (postType && (postType === "post" || postType === "story")) {
            query.postType = postType;
        }

        const skip = (Number(page) - 1) * Number(limit);
        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Post.countDocuments(query);

        return res.status(200).json({ 
            message: "Posts Fetched Successfully", 
            posts,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        next(error)
    }
}