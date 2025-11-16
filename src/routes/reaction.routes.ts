import { Router } from "express";
import {
    createOrUpdateReaction,
    removeReaction,
    getReactions,
    getReactionsSummary,
    getUserReaction
} from "../controllers/reaction.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";

const router = Router();

// Create or update a reaction on a post
router.post("/:postId", requireAuthentication, createOrUpdateReaction);

// Remove a reaction from a post
router.delete("/:postId", requireAuthentication, removeReaction);

// Get all reactions for a post
router.get("/:postId", getReactions);

// Get reactions summary (count by type) for a post
router.get("/:postId/summary", getReactionsSummary);

// Get current user's reaction on a post
router.get("/:postId/user", requireAuthentication, getUserReaction);

export default router;
