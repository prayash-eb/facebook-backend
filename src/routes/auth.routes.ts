import { Router } from "express";
import { userLogin, userRegister, changePassword } from "../controllers/auth.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";

const authRouter = Router()

authRouter.post("/login", userLogin);
authRouter.post("/register", userRegister);
authRouter.post("/change-password", requireAuthentication, changePassword)

export default authRouter