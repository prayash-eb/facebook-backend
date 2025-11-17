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

friendshipRouter.patch("/accept-request", requireAuthentication, acceptFriendRequest);
friendshipRouter.post("/send-friend-request", requireAuthentication, createFriendRequest);
friendshipRouter.get("/", requireAuthentication, getFriends)
friendshipRouter.get("/requests", requireAuthentication, getFriendRequests)
friendshipRouter.delete("/unfriend/", requireAuthentication, unfriend)
friendshipRouter.delete("/request", requireAuthentication, deleteFriendRequests)


export default friendshipRouter