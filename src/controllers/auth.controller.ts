import type { NextFunction, Request, Response } from "express";
import { User, type IUser } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import { isValidEmail } from "../utils/validation.js";
import { logAuthEvent, logControllerAction, logValidationError, logError } from "../utils/logger.js";

export const userRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userData = req.body as IUser;
        logControllerAction('AuthController', 'userRegister', undefined, { email: userData.email });

        // Validate email format
        if (!isValidEmail(userData.email)) {
            logValidationError('email', userData.email, 'Invalid email format');
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Validate password strength
        if (!userData.password || userData.password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long" });
        }

        // Validate full name
        if (!userData.fullName || userData.fullName.trim().length < 2) {
            return res.status(400).json({ message: "Full name must be at least 2 characters long" });
        }

        const userAlreadyExist = await User.findOne({
            email: userData.email.toLowerCase()
        })
        if (userAlreadyExist) {
            return res.status(409).json({ message: "User already exist" })
        }

        // Sanitize and normalize data
        const sanitizedData = {
            ...userData,
            email: userData.email.toLowerCase().trim(),
            fullName: userData.fullName.trim(),
            bio: userData.bio?.trim().substring(0, 500) || undefined
        };

        const newUser = await User.create(sanitizedData);
        logAuthEvent('register', String(newUser._id), true, { email: newUser.email });
        return res.status(201).json({ success: true, user: newUser });
    } catch (error: any) {
        logError('User registration failed', error, { email: req.body.email });
        next(error);
    }
}

export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userLoginData: { email: string, password: string } = req.body;
        logControllerAction('AuthController', 'userLogin', undefined, { email: userLoginData.email });

        // Validate input
        if (!userLoginData.email || !userLoginData.password) {
            logValidationError('credentials', { email: userLoginData.email }, 'Email and password are required');
            return res.status(400).json({ message: "Email and password are required" });
        }

        if (!isValidEmail(userLoginData.email)) {
            logValidationError('email', userLoginData.email, 'Invalid email format');
            return res.status(400).json({ message: "Invalid email format" });
        }

        const userExist = await User.findOne({
            email: userLoginData.email.toLowerCase()
        })
        if (!userExist) {
            logAuthEvent('login', undefined, false, { email: userLoginData.email, reason: 'User not found' });
            return res.status(401).json({ message: "Invalid Credentials" });
        }
        const isPasswordMatched = await bcrypt.compare(userLoginData.password, userExist.password)
        if (!isPasswordMatched) {
            logAuthEvent('login', String(userExist._id), false, { email: userLoginData.email, reason: 'Invalid password' });
            return res.status(401).json({ message: "Invalid Credentials" });
        }
        const tokenPayload = {
            id: userExist._id,
            email: userLoginData.email
        }
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '7d' });
        logAuthEvent('login', String(userExist._id), true, { email: userLoginData.email });
        return res.status(200).json({ success: true, token, user: userExist });
    } catch (error: any) {
        logError('User login failed', error, { email: req.body.email });
        next(error);
    }
}

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { oldPassword, newPassword } = req.body;
        logControllerAction('AuthController', 'changePassword', userId?.toString());

        // Validate input
        if (!oldPassword || !newPassword) {
            logValidationError('password', undefined, 'Old and new password are required', { userId: userId?.toString() });
            return res.status(400).json({ message: "Old password and new password are required" });
        }

        if (newPassword.length < 6) {
            logValidationError('newPassword', newPassword.length, 'Password too short', { userId: userId?.toString() });
            return res.status(400).json({ message: "New password must be at least 8 characters long" });
        }

        if (oldPassword === newPassword) {
            logValidationError('newPassword', undefined, 'Same as old password', { userId: userId?.toString() });
            return res.status(400).json({ message: "New password must be different from old password" });
        }

        const user = await User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        const isPasswordMatched = await bcrypt.compare(oldPassword, user.password)

        if (!isPasswordMatched) {
            logAuthEvent('password_change', userId?.toString(), false, { reason: 'Invalid old password' });
            return res.status(401).json({ message: "Invalid Old Password" })
        }
        user.password = newPassword;
        await user.save();
        logAuthEvent('password_change', userId?.toString(), true);
        return res.status(200).json({ message: "Password Changed Successfully" })
    } catch (error: any) {
        logError('Change password failed', error, { userId: req.user?.id?.toString() });
        next(error)
    }
}