import { Router } from "express";

import { requireAuthentication } from "../middleware/auth.middleware.js";
import {
    acceptFriendRequest,
    createFriendRequest,
    deleteFriendRequests,
    getFriendRequests,
    getFriends,
    unfriend
} from "../controllers/friendship.controller.js";

const friendshipRouter = Router()

friendshipRouter.patch("/accept-friend", requireAuthentication, acceptFriendRequest);
friendshipRouter.post("/send-friend-request", requireAuthentication, createFriendRequest);
friendshipRouter.get("/", requireAuthentication, getFriends)
friendshipRouter.get("/requests", requireAuthentication, getFriendRequests)
friendshipRouter.delete("/friend-request", requireAuthentication, deleteFriendRequests)
friendshipRouter.delete("/unfriend", requireAuthentication, unfriend)

export default friendshipRouter