import { Schema, Document, Types, model } from "mongoose";

export type ReactionType = "like" | "love" | "care" | "angry" | "sad"
export const ReactionEnum = ["like", "love", "care", "angry", "sad"]

interface IReaction extends Document {
    postId: Types.ObjectId;
    userId: Types.ObjectId;
    reactionType: ReactionType;
    createdAt: Date;
    updatedAt: Date;
}

const reactionSchema = new Schema<IReaction>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    postId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    reactionType: {
        type: String,
        enum: ReactionEnum,
        default: "like"
    }
}, { timestamps: true })


export const Reaction = model<IReaction>("reactions", reactionSchema)