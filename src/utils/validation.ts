import { Types } from "mongoose";

/**
 * Validation utility functions
 */

export const isValidObjectId = (id: string): boolean => {
    return Types.ObjectId.isValid(id);
};

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const sanitizeString = (str: string, maxLength: number = 1000): string => {
    return str.trim().substring(0, maxLength);
};
