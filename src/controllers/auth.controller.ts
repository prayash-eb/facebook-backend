import type { NextFunction, Request, Response } from "express";
import { User, type IUser } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"

export const userRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userData = req.body as IUser;
        const userAlreadyExist = await User.findOne({
            email: userData.email
        })
        if (userAlreadyExist) {
            return res.status(409).json({ message: "User already exist" })
        }
        const newUser = await User.create(userData)
        return res.status(201).json({ success: true, user: newUser })
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ error })
    }
}

export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userLoginData: { email: string, password: string } = req.body;
        const userExist = await User.findOne({
            email: userLoginData.email
        })
        if (!userExist) {
            return res.status(404).json({ message: "Invalid Credentials" });
        }
        const isPasswordMatched = await bcrypt.compare(userLoginData.password, userExist.password)
        if (!isPasswordMatched) {
            return res.status(404).json({ message: " Invalid Credentials" });
        }
        const tokenPayload = {
            id: userExist._id,
            email: userLoginData.email
        }
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!)
        return res.status(201).json({ success: true, token })
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ error: error.message })
    }
}

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        const isPasswordMatched = await bcrypt.compare(oldPassword, user.password)

        if (!isPasswordMatched) {
            return res.status(404).json({ message: "Invalid Old Password" })
        }
        user.password = newPassword;
        await user.save()
        return res.status(200).json({ message: "Password Changed Successfully" })
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ error })
    }
}