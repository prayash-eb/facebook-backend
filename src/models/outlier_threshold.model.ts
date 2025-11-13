import { Schema, Document, Types, model } from "mongoose";

interface IOutlierThreshold extends Document {
    reactionThreshold: number;
    commentThreshold: number;
    shareThreshold: number;
    version: number
    createdAt: Date,
    updatedAt: Date
}

const outlierThresholdSchema = new Schema<IOutlierThreshold>({
    reactionThreshold: {
        type: Number,
        required: true
    },
    commentThreshold: {
        type: Number,
        required: true
    },
    shareThreshold: {
        type: Number,
        required: true
    },
    version: {
        type: Number,
        required: true
    },
}, {
    timestamps: true
})

export const OutlierThreshold = model<IOutlierThreshold>("outlier_thresholds", outlierThresholdSchema)