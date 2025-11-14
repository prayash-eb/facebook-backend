import { Router } from "express";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import { createThreshold, deleteThreshold, editThreshold } from "../controllers/outlier-threshold.controller.js";

const outlierThresholdRouter = Router()

outlierThresholdRouter.post("/create", requireAuthentication, createThreshold);
outlierThresholdRouter.delete("/delete", requireAuthentication, deleteThreshold);
outlierThresholdRouter.patch("/edit/:thresholdId", requireAuthentication, editThreshold)

export default outlierThresholdRouter