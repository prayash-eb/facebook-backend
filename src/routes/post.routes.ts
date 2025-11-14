import { Router } from "express";
import { createPost, editPost, getPosts, getSinglePost } from "../controllers/post.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const postRouter = Router()

postRouter.post("/create", requireAuthentication, upload.array("media", 10), createPost)
postRouter.patch("/update/:postId", requireAuthentication, upload.array("media", 10), editPost)
postRouter.get("/:postId", requireAuthentication, getSinglePost)
postRouter.get("/", requireAuthentication, getPosts)

export default postRouter