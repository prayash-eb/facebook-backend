import { Router } from "express";
import {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    checkFollowStatus,
    getFollowStats
} from "../controllers/follow.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";

const router = Router();

// Follow a user
router.post("/:targetId", requireAuthentication, followUser);

// Unfollow a user
router.delete("/:targetId", requireAuthentication, unfollowUser);

// Get followers of a user
router.get("/:userId/followers", getFollowers);

// Get users that a user is following
router.get("/:userId/following", getFollowing);

// Check if current user is following a target user
router.get("/:targetId/status", requireAuthentication, checkFollowStatus);

// Get follow statistics
router.get("/:userId/stats", getFollowStats);

export default router;
