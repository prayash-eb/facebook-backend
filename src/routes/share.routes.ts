import { Router } from "express";
import {
    sharePost,
    unsharePost,
    getUserShares,
    getPostShares,
} from "../controllers/share.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";

const router = Router();

// Share a post
router.post("/:postId", requireAuthentication, sharePost);

// Unshare a post
router.delete("/:postId", requireAuthentication, unsharePost);

// Get user's shares
router.get("/", requireAuthentication, getUserShares);

// Get all shares for a post
router.get("/:postId/shares", getPostShares);


export default router;
