import type { Request, Response, NextFunction } from "express";
import { OutlierThreshold } from "../models/outlier_threshold.model.js";

export const createThreshold = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const thresholdData = req.body;
        const threshold = await OutlierThreshold.create({
            ...thresholdData
        })
        if (!threshold) {
            return res.status(400).json({ message: "Error while creating threshold" })
        }

        return res.status(200).json({ message: "Threshold created successfully", threshold })
    } catch (error) {
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
        const { thresholdId } = req.params
        const { thresholdData } = req.body;

        const updatedThreshold = await OutlierThreshold.findByIdAndUpdate(thresholdId, {
            ...thresholdData
        }, { new: true })

        if (!updatedThreshold) {
            return res.status(200).json({ message: "Error while updating threshold" })
        }

        return res.status(200).json({
            message: "Threshold Updated Successfully",
            threshold: updatedThreshold
        })

    } catch (error) {
        next(error);
    }
};

export const getThreshold = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const threshold = await OutlierThreshold.findOne({}).sort({ createdAt: -1 })
        return res.status(200).json({
            message: "Threshold Fetched Successfully",
            threshold
        })
    } catch (error) {
        next(error);
    }
};

