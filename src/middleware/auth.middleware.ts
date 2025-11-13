import type mongoose from "mongoose";
import jwt from "jsonwebtoken"
import type { Request, Response, NextFunction } from "express";

export interface JWTPayload extends jwt.JwtPayload {
    id: mongoose.Types.ObjectId;
    email: string;
    iat?: number;
    exp?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export const requireAuthentication = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Extract & validate header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            res.status(401).json({ message: "Authorization header missing or malformed" });
        }
        const token = authHeader?.split(" ")[1];
        if (!token) res.status(401).json({ message: "Missing Token" });

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) throw new Error("JWT_ACCESS_SECRET not configured");

        const decoded = jwt.verify(token as string, JWT_SECRET) as JWTPayload;
        req.user = decoded;
        next();
    } catch (error: any) {
        console.error("Authentication Error", error)
        res.status(500).json({ message: "Authentication error", error: error.message });
    }
};
