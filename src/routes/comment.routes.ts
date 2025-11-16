import { Router } from "express";
import {
    createComment,
    getComments,
    getReplies,
    updateComment,
    deleteComment
} from "../controllers/comment.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

// Create a comment on a post
router.post("/:postId", requireAuthentication, upload.single("media"), createComment);

// Get comments for a post
router.get("/:postId", getComments);

// Get replies for a comment
router.get("/:commentId/replies", getReplies);

// Update a comment
router.put("/:commentId", requireAuthentication, updateComment);

// Delete a comment
router.delete("/:commentId", requireAuthentication, deleteComment);

export default router;
