import type { Request, Response, NextFunction } from "express";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { OutlierThreshold } from "../models/outlier_threshold.model.js";

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { postId } = req.params;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const outlierThreshold = await OutlierThreshold.find({})

        if (post?.commentsCount) {

        }
        const commentData = req.body;
        const comment = await Comment.create({
            ...commentData,
            userId
        })
        if (!comment) {
            return res.status(400).json({ message: "Error while creating comment" });
        }
        return res.status(201).json({ message: "Comment Successfull", comment })
    } catch (error) {
        next(error)
    }
}