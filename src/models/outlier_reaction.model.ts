import { Schema, Document, Types, model } from "mongoose";
import { ReactionEnum, type ReactionType } from "./reaction.model.js";

interface IBucketReaction extends Document {
    userId: Types.ObjectId;
    reactionType: ReactionType;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface IOutlierReaction extends Document {
    postId: Types.ObjectId;
    bucketId: string;
    isFull: boolean;
    count: number;
    reactions: IBucketReaction[];
    createdAt: Date;
    updatedAt: Date
}

const bucketReactionSchema = new Schema<IBucketReaction>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref:"user"
    },
    reactionType: {
        type: String,
        enum: ReactionEnum,
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

const outlierReactionSchema = new Schema<IOutlierReaction>({
    postId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref:"post"
    },
    bucketId: {
        type: String,
        required: true
    },
    reactions: [bucketReactionSchema],
    isFull: {
        type: Boolean,
        default: false
    },
    count: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
})

export const OutlierReaction = model<IOutlierReaction>("outlier_reactions", outlierReactionSchema)