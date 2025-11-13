import type { NextFunction, Request, Response } from "express";

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
    console.log(`[ERROR_LOG]: ${errorName}-${message}`, error);

    return res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV === "dev" ? { errorName } : {}),
    });
};