import type { NextFunction, Request, Response } from "express";
import { logError } from "../utils/logger.js";

interface CustomError extends Error {
    statusCode?: number;
}

export const errorHandler = (
    error: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = error.statusCode || 500;
    const message = error.message;
    const errorName = error.name;
    
    // Log error with full context
    logError(
        `${errorName}: ${message}`,
        error,
        {
            statusCode,
            method: req.method,
            path: req.path,
            userId: (req as any).user?.id?.toString(),
            ip: req.headers['x-forwarded-for'] || req.ip,
            userAgent: req.headers['user-agent'],
        }
    );

    return res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV === "dev" ? { errorName } : {}),
    });
};