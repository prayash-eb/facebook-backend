import type { Request, Response, NextFunction } from "express";
import { outlierThresholdService } from "../services/outlier-threshold.service.js";
import { OutlierThreshold } from "../models/outlier_threshold.model.js";

export const createThreshold = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { reactionThreshold, commentThreshold, shareThreshold, version, enabled } = req.body;

        // Validate input
        if (!reactionThreshold || !commentThreshold || !shareThreshold || !version) {
            return res.status(400).json({ 
                message: "All threshold values and version are required" 
            });
        }

        if (reactionThreshold < 1 || commentThreshold < 1 || shareThreshold < 1) {
            return res.status(400).json({ 
                message: "Threshold values must be positive numbers" 
            });
        }

        if (version < 1 || !Number.isInteger(version)) {
            return res.status(400).json({ 
                message: "Version must be a positive integer" 
            });
        }

        const threshold = await outlierThresholdService.createThreshold({
            reactionThreshold,
            commentThreshold,
            shareThreshold,
            version,
            enabled: enabled === true // Only enable if explicitly set to true
        });

        return res.status(201).json({ 
            message: "Threshold created successfully", 
            threshold 
        });
    } catch (error: any) {
        if (error.message.includes("already exists")) {
            return res.status(409).json({ message: error.message });
        }
        next(error);
    }
};

export const deleteThreshold = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { thresholdId } = req.params;
        const threshold = await OutlierThreshold.findById(thresholdId);
        if (!threshold) {
            return res.status(404).json({ message: "Threshold not found" })
        }
        await threshold.deleteOne()
        return res.status(200).json({ message: "Threshold deleted successfully", threshold })
    } catch (error) {
        next(error);
    }
};

export const editThreshold = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { thresholdId } = req.params;

        if (!thresholdId) {
            return res.status(400).json({ message: "Threshold ID is required" });
        }

        const { reactionThreshold, commentThreshold, shareThreshold, enabled } = req.body;

        // Validate at least one field is provided
        if (reactionThreshold === undefined && commentThreshold === undefined && 
            shareThreshold === undefined && enabled === undefined) {
            return res.status(400).json({ 
                message: "At least one field must be provided to update" 
            });
        }

        const updates: any = {};
        if (reactionThreshold !== undefined) updates.reactionThreshold = reactionThreshold;
        if (commentThreshold !== undefined) updates.commentThreshold = commentThreshold;
        if (shareThreshold !== undefined) updates.shareThreshold = shareThreshold;
        if (enabled !== undefined) updates.enabled = enabled;

        const updatedThreshold = await outlierThresholdService.updateThreshold(thresholdId!, updates);

        return res.status(200).json({
            message: "Threshold Updated Successfully",
            threshold: updatedThreshold
        });
    } catch (error: any) {
        if (error.message === "Threshold not found") {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("must be a positive number")) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

export const getThreshold = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const threshold = await outlierThresholdService.getCurrentThreshold();
        
        if (!threshold) {
            return res.status(404).json({ 
                message: "No threshold configured. Using default values.",
                defaults: {
                    reactionThreshold: 1000,
                    commentThreshold: 1000,
                    shareThreshold: 500
                }
            });
        }

        return res.status(200).json({
            message: "Threshold Fetched Successfully",
            threshold
        });
    } catch (error) {
        next(error);
    }
};

export const getAllThresholds = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const thresholds = await outlierThresholdService.getAllThresholds();

        return res.status(200).json({
            message: "All thresholds fetched successfully",
            thresholds
        });
    } catch (error) {
        next(error);
    }
};

export const enableThreshold = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { thresholdId } = req.params;

        if (!thresholdId) {
            return res.status(400).json({ message: "Threshold ID is required" });
        }

        const threshold = await outlierThresholdService.enableThreshold(thresholdId);

        return res.status(200).json({
            message: "Threshold enabled successfully",
            threshold
        });
    } catch (error: any) {
        if (error.message === "Threshold not found") {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};

export const disableThreshold = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { thresholdId } = req.params;

        if (!thresholdId) {
            return res.status(400).json({ message: "Threshold ID is required" });
        }

        const threshold = await outlierThresholdService.disableThreshold(thresholdId);

        return res.status(200).json({
            message: "Threshold disabled successfully",
            threshold
        });
    } catch (error: any) {
        if (error.message === "Threshold not found") {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};

