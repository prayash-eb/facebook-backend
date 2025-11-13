import type { Request, Response, NextFunction } from "express";
import { Post, type IPost } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from "../middleware/upload.middleware.js";
import { uploadToCloudinary } from "../libs/cloudinary.js";
import { Types } from "mongoose";


export const createPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { textContent, privacy, tags, postType } = JSON.parse(req.body.data);

        const files = req.files as Express.Multer.File[] | undefined;

        if (!textContent && (!files || files.length === 0))
            return res.status(400).json({ message: "Post must have text or media" });

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

        const user = await User.findById(userId);

        const newPost = new Post({
            userId: new Types.ObjectId(userId),
            fullName: user?.fullName,
            userAvatar: user?.profilePic || "",
            textContent,
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
        const { postId } = req.params;
        const post = await Post.findById(postId);
        if (post?.privacy === "public") {
            return res.status(200).json({ message: "Post Fetched Successfully", post })
        }

    } catch (error) {
        next(error)
    }
}

export const getPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {

    } catch (error) {
        next(error)

    }
}

export const editPost = async (req: Request, res: Response, next: NextFunction) => {
    try {

    } catch (error) {
        next(error)

    }
}

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
    try {

    } catch (error) {
        next(error)

    }
}