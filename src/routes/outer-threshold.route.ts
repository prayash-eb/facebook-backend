import { Router } from "express";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import { 
    createThreshold, 
    deleteThreshold, 
    editThreshold, 
    getThreshold,
    getAllThresholds,
    enableThreshold,
    disableThreshold
} from "../controllers/outlier-threshold.controller.js";

const outlierThresholdRouter = Router()

// Get currently enabled threshold
outlierThresholdRouter.get("/current", requireAuthentication, getThreshold);

// Get all thresholds (all versions)
outlierThresholdRouter.get("/all", requireAuthentication, getAllThresholds);

// Create new threshold
outlierThresholdRouter.post("/", requireAuthentication, createThreshold);

// Update threshold
outlierThresholdRouter.patch("/:thresholdId", requireAuthentication, editThreshold);

// Enable a specific threshold (disables all others)
outlierThresholdRouter.patch("/:thresholdId/enable", requireAuthentication, enableThreshold);

// Disable a specific threshold
outlierThresholdRouter.patch("/:thresholdId/disable", requireAuthentication, disableThreshold);

// Delete threshold
outlierThresholdRouter.delete("/:thresholdId", requireAuthentication, deleteThreshold);

export default outlierThresholdRouter