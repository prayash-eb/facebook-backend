import { Schema, Document, Types, model } from "mongoose";

interface IComment extends Document {
    userId: Types.ObjectId;
    postId: Types.ObjectId;
    comment?: string;
    parentCommentId: Types.ObjectId;
    media?: string;
    createdAt: Date;
    updatedAt: Date;
}

const commentSchema = new Schema<IComment>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    postId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    comment: {
        type: String
    },
    parentCommentId: {
        type: Schema.Types.ObjectId,
    },
    media: {
        type: String
    }
}, {
    timestamps: true
})

export const Comment = model<IComment>("comments", commentSchema)