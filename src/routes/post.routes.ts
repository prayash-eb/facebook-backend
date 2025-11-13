import { Router } from "express";
import { createPost } from "../controllers/post.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const postRouter = Router()

postRouter.post("/create", requireAuthentication, upload.array("media", 10), createPost)

export default postRouter